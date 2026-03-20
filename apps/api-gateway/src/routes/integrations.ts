import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

const customerIngestRow = z
  .object({
    externalRef: z.string().max(200).optional(),
    /** Alias de `cvu` — CVU del cliente (mismo campo que codigoUnico en DB). */
    codigoUnico: z.string().optional(),
    cvu: z.string().optional(),
    codigoVenta: z.string().optional(),
    razonSocial: z.string(),
    email: z.string().email(),
    telefono: z.string().optional(),
    cuit: z.string().optional(),
  })
  .refine((r) => Boolean((r.codigoUnico ?? r.cvu)?.trim()), {
    message: 'Indicá codigoUnico o cvu',
  });

const ingestSchema = z.object({
  customers: z.array(customerIngestRow).optional(),
  invoices: z
    .array(
      z.object({
        externalRef: z.string().max(200).optional(),
        numero: z.string(),
        montoPesos: z.number().positive(),
        fechaVto: z.string(),
        estado: z.enum(['ABIERTA', 'VENCIDA', 'PARCIAL', 'SALDADA']).optional(),
        customerExternalRef: z.string().optional(),
        codigoUnicoCliente: z.string().optional(),
        /** Alias de codigoUnicoCliente (CVU del cliente). */
        cvuCliente: z.string().optional(),
        customerId: z.string().uuid().optional(),
      })
    )
    .optional(),
});

/**
 * Ingesta por lotes: sincronización desde ERP / sistema de facturación (upsert por externalRef o código/número).
 * POST /v1/integrations/ingest
 */
export async function integrationRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/integrations/ingest',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = ingestSchema.parse(request.body);

      if (!(body.customers?.length || body.invoices?.length)) {
        return reply.status(400).send({ error: 'Enviá al menos un arreglo customers o invoices' });
      }

      const result = {
        customersCreated: 0,
        customersUpdated: 0,
        invoicesCreated: 0,
        invoicesUpdated: 0,
        errors: [] as string[],
      };

      const normCuit = (s: string) => s.replace(/\D/g, '');
      const tenantId = user.tenant_id;

      const resolveCustomerId = async (row: {
        customerExternalRef?: string;
        codigoUnicoCliente?: string;
        cvuCliente?: string;
        customerId?: string;
      }): Promise<string | null> => {
        if (row.customerId) {
          const c = await prisma.customer.findFirst({
            where: { id: row.customerId, tenantId },
          });
          return c?.id ?? null;
        }
        if (row.customerExternalRef?.trim()) {
          const c = await prisma.customer.findFirst({
            where: { tenantId, externalRef: row.customerExternalRef.trim() },
          });
          return c?.id ?? null;
        }
        const codigoCliente = (row.codigoUnicoCliente ?? row.cvuCliente)?.trim();
        if (codigoCliente) {
          const c = await prisma.customer.findFirst({
            where: { tenantId, codigoUnico: codigoCliente },
          });
          return c?.id ?? null;
        }
        return null;
      };

      if (body.customers) {
        for (let i = 0; i < body.customers.length; i++) {
          const c = body.customers[i]!;
          const codigo = (c.codigoUnico ?? c.cvu)!.trim();
          try {
            let existing = c.externalRef?.trim()
              ? await prisma.customer.findFirst({
                  where: { tenantId, externalRef: c.externalRef.trim() },
                })
              : null;
            if (!existing) {
              existing = await prisma.customer.findFirst({
                where: { tenantId, codigoUnico: codigo },
              });
            }

            const email = c.email.trim().toLowerCase();
            if (existing) {
              await prisma.customer.update({
                where: { id: existing.id },
                data: {
                  razonSocial: c.razonSocial.trim(),
                  email,
                  telefono: c.telefono?.trim(),
                  codigoVenta: c.codigoVenta?.trim() || existing.codigoVenta,
                  externalRef: c.externalRef?.trim() || existing.externalRef,
                },
              });
              if (c.cuit?.trim()) {
                const nc = normCuit(c.cuit);
                const has = await prisma.customerCuit.findFirst({
                  where: { tenantId, customerId: existing.id, cuit: nc },
                });
                if (!has) {
                  await prisma.customerCuit.create({
                    data: { tenantId, customerId: existing.id, cuit: nc, isPrimary: true },
                  });
                }
              }
              result.customersUpdated++;
            } else {
              const dupEmail = await prisma.customer.findFirst({ where: { tenantId, email } });
              if (dupEmail) {
                result.errors.push(`Cliente ${i + 1}: email ${email} ya existe en otro registro`);
                continue;
              }
              if (c.externalRef?.trim()) {
                const er = await prisma.customer.findFirst({
                  where: { tenantId, externalRef: c.externalRef.trim() },
                });
                if (er) {
                  result.errors.push(`Cliente ${i + 1}: externalRef duplicado`);
                  continue;
                }
              }
              await prisma.customer.create({
                data: {
                  tenantId,
                  externalRef: c.externalRef?.trim() || null,
                  codigoUnico: codigo,
                  codigoVenta: c.codigoVenta?.trim() || '000',
                  razonSocial: c.razonSocial.trim(),
                  email,
                  telefono: c.telefono?.trim(),
                  customerCuits: c.cuit?.trim()
                    ? {
                        create: {
                          tenantId,
                          cuit: normCuit(c.cuit),
                          isPrimary: true,
                        },
                      }
                    : undefined,
                },
              });
              result.customersCreated++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(`Cliente ${i + 1}: ${msg}`);
          }
        }
      }

      if (body.invoices) {
        for (let i = 0; i < body.invoices.length; i++) {
          const inv = body.invoices[i]!;
          try {
            const customerId = await resolveCustomerId(inv);
            if (!customerId) {
              result.errors.push(
                `Factura ${i + 1}: no se encontró cliente (customerId / customerExternalRef / codigoUnicoCliente / cvuCliente)`
              );
              continue;
            }

            const monto = Math.round(inv.montoPesos * 100);
            const fv = inv.fechaVto.trim();
            let fechaVto: Date;
            if (fv.includes('/')) {
              const parts = fv.split('/').map(Number);
              fechaVto = new Date(parts[2]!, parts[1]! - 1, parts[0]!);
            } else {
              fechaVto = new Date(fv);
            }
            if (isNaN(fechaVto.getTime())) {
              result.errors.push(`Factura ${i + 1}: fechaVto inválida`);
              continue;
            }

            const estado = inv.estado || 'ABIERTA';
            const numero = inv.numero.trim();

            let existing = inv.externalRef?.trim()
              ? await prisma.invoice.findFirst({
                  where: { tenantId, externalRef: inv.externalRef.trim() },
                })
              : null;
            if (!existing) {
              existing = await prisma.invoice.findFirst({
                where: { tenantId, numero },
              });
            }

            if (existing) {
              await prisma.invoice.update({
                where: { id: existing.id },
                data: {
                  monto,
                  fechaVto,
                  estado,
                  customerId,
                  externalRef: inv.externalRef?.trim() || existing.externalRef,
                },
              });
              result.invoicesUpdated++;
            } else {
              await prisma.invoice.create({
                data: {
                  tenantId,
                  customerId,
                  externalRef: inv.externalRef?.trim() || null,
                  numero,
                  monto,
                  fechaVto,
                  estado,
                },
              });
              result.invoicesCreated++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(`Factura ${i + 1}: ${msg}`);
          }
        }
      }

      fastify.log.info(
        {
          tenantId,
          ...result,
        },
        'ERP ingest completed'
      );

      return result;
    }
  );
}
