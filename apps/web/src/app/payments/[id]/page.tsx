'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PaymentDetailResponse {
  payment: {
    id: string;
    sourceSystem: string;
    method: string;
    status: string;
    externalRef: string | null;
    createdAt: string;
    settledAt: string | null;
    updatedAt: string;
    totalAmount: number;
    unappliedAmountCents: number | null;
    metadata: unknown;
    applications: Array<{
      id: string;
      invoice: {
        id: string;
        numero: string;
        monto: number;
        fechaVto: string;
        estado: string;
        customer: {
          razonSocial: string;
          codigoUnico: string;
          email: string | null;
          telefono: string | null;
        };
      };
      amount: number;
      isAuthoritative: boolean;
      appliedAt: string;
      externalApplicationRef: string | null;
    }>;
  };
}

function invoiceEstadoBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    ABIERTA: { label: 'Por vencer', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    VENCIDA: { label: 'Vencido', className: 'bg-red-50 text-red-700 border-red-200' },
    PARCIAL: { label: 'Parcial', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    SALDADA: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PAGADA: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
  const s = map[estado] ?? { label: estado, className: '' };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export default function PaymentDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, isError, error } = useQuery<PaymentDetailResponse>({
    queryKey: ['payment-detail', id],
    queryFn: async () => {
      const r = await api.get<PaymentDetailResponse>(`/v1/payments/${id}`);
      return r.data;
    },
    enabled: Boolean(id),
  });

  const applications = Array.isArray(data?.payment?.applications) ? data.payment.applications : [];

  return (
    <MainLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/payments/transfers">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Transferencias
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando pago…
          </div>
        )}

        {isError && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-destructive text-sm">
              {error instanceof Error ? error.message : 'No se pudo cargar el pago.'}
            </CardContent>
          </Card>
        )}

        {!isLoading && data?.payment && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Detalle del pago</h1>
              <p className="text-sm text-muted-foreground mt-1 font-mono break-all">{data.payment.id}</p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Origen</span>
                  <p className="font-medium">{data.payment.sourceSystem}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <p className="font-medium">{data.payment.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Referencia externa</span>
                  <p className="font-mono text-xs break-all">{data.payment.externalRef ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monto</span>
                  <p className="font-semibold">
                    ${(data.payment.totalAmount / 100).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Alta</span>
                  <p>
                    {format(new Date(data.payment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                {data.payment.settledAt && (
                  <div>
                    <span className="text-muted-foreground">Liquidado</span>
                    <p>
                      {format(new Date(data.payment.settledAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Imputaciones a facturas</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin imputaciones registradas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Aplicado</TableHead>
                        <TableHead>Estado factura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <Link
                              href={`/invoices/${app.invoice.id}`}
                              className="text-emerald-600 font-medium hover:underline"
                            >
                              {app.invoice.numero}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {app.invoice.customer?.razonSocial ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(app.amount / 100).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{invoiceEstadoBadge(app.invoice.estado)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
