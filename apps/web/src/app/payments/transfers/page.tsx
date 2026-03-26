'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, CheckCircle2, Clock, XCircle, Eye, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Solo true si en build está NEXT_PUBLIC_SHOW_CRESIUM_DEBUG=true (dev/staging). Nunca en cliente final. */
const SHOW_CRESIUM_DEBUG = process.env.NEXT_PUBLIC_SHOW_CRESIUM_DEBUG === 'true';

interface Transfer {
  id: string;
  sourceSystem: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
  settledAt: string | null;
  totalAmount: number;
  /** Nombre del ordenante si vino en el webhook Cresium */
  payerDisplayName?: string | null;
  /** CVU detectado en el payload (extractedCvuDigits / escaneo) */
  payerCvu?: string | null;
  /** CUIT del pagador (11 dígitos, formato XX-XXXXXXXX-X) desde extractedTaxIds / payload */
  payerCuit?: string | null;
  /** Cliente (deudor) si ya está imputado a factura */
  imputedCustomerName?: string | null;
  applications: Array<{
    id: string;
    invoice: {
      id: string;
      numero: string;
      customer: {
        razonSocial: string;
        codigoUnico: string;
      };
    };
    amount: number;
    isAuthoritative: boolean;
    appliedAt: string;
  }>;
}

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceSystemFilter, setSourceSystemFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState<'uuid' | 'env' | null>(null);

  const copyText = async (text: string, kind: 'uuid' | 'env') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const { data, isLoading, isError, error } = useQuery<{
    transfers: Transfer[];
    total: number;
    totalAmount: number;
  }>({
    queryKey: ['payments-transfers', statusFilter, sourceSystemFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (sourceSystemFilter !== 'all') {
        params.sourceSystem = sourceSystemFilter;
      }
      const response = await api.get('/v1/payments/transfers', { params });
      return response.data;
    },
  });

  /** Solo para diagnóstico interno (SHOW_CRESIUM_DEBUG). */
  const { data: session } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const r = await api.get<{
        tenantId: string;
        tenantName: string | null;
        email: string | null;
      }>('/auth/me');
      return r.data;
    },
    staleTime: 60_000,
    enabled: SHOW_CRESIUM_DEBUG,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APLICADO':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aplicado
          </Badge>
        );
      case 'PEND_LIQ':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente Liquidación
          </Badge>
        );
      case 'LIQUIDADO':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Liquidado
          </Badge>
        );
      case 'RECHAZADO':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceSystemBadge = (sourceSystem: string) => {
    switch (sourceSystem) {
      case 'CRESIUM':
        return <Badge className="bg-cyan-100 text-cyan-800">Cresium</Badge>;
      case 'MANUAL':
        return <Badge className="bg-gray-100 text-gray-700">Manual</Badge>;
      default:
        return <Badge variant="outline">{sourceSystem}</Badge>;
    }
  };

  const filteredTransfers = data?.transfers.filter((transfer) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const apps = transfer.applications ?? [];
      return (
        transfer.externalRef?.toLowerCase().includes(search) ||
        transfer.payerDisplayName?.toLowerCase().includes(search) ||
        transfer.payerCvu?.replace(/\s/g, '').includes(search.replace(/\s/g, '')) ||
        transfer.payerCuit?.replace(/[-\s]/g, '').includes(search.replace(/[-\s]/g, '')) ||
        transfer.imputedCustomerName?.toLowerCase().includes(search) ||
        apps.some(
          (app) =>
            app.invoice?.numero?.toLowerCase().includes(search) ||
            app.invoice?.customer?.razonSocial?.toLowerCase().includes(search)
        )
      );
    }
    return true;
  }) || [];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Transferencias Bancarias
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Pagos recibidos por transferencias bancarias
          </p>
        </div>

        {SHOW_CRESIUM_DEBUG && session && (
          <Card className="mb-6 border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cyan-900">
                Prueba Cresium — coincidencia de IDs
              </CardTitle>
              <p className="text-sm text-gray-700">
                Tu usuario ({session.email ?? 'sesión'}) ve solo pagos del tenant del token. Los webhooks guardan con{' '}
                <code className="rounded bg-white px-1 py-0.5 text-xs">CRESIUM_TENANT_ID</code>. Para la prueba, ese
                valor tiene que ser <strong>exactamente el mismo</strong> que abajo.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  1) Tenant de tu usuario (sesión API / JWT)
                </p>
                <code className="mt-1 block break-all rounded border border-cyan-100 bg-white px-2 py-2 text-sm">
                  {session.tenantId}
                </code>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  2) Poné este mismo UUID en Railway → servicio rail-cucuru → variable{' '}
                  <code className="rounded bg-cyan-100 px-1">CRESIUM_TENANT_ID</code>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-cyan-300 bg-white"
                    onClick={() => copyText(session.tenantId, 'uuid')}
                  >
                    {copied === 'uuid' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copiar UUID
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-cyan-300 bg-white"
                    onClick={() =>
                      copyText(`CRESIUM_TENANT_ID=${session.tenantId}`, 'env')
                    }
                  >
                    {copied === 'env' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copiar línea .env
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Guardá en Railway, redeploy <strong>rail-cucuru</strong>. Depósitos nuevos quedarán alineados. Si ya
                  hay filas en <code className="rounded bg-white px-0.5">pay.payments</code> con otro{' '}
                  <code className="rounded bg-white px-0.5">tenant_id</code>, actualizalas o repetí el webhook de
                  prueba.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>No pudimos cargar las transferencias.</strong>{' '}
            {SHOW_CRESIUM_DEBUG ? (
              <>
                {(error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  (error as Error)?.message ??
                  'Revisá red / NEXT_PUBLIC_API_URL.'}
              </>
            ) : (
              'Intentá de nuevo en unos minutos. Si el problema continúa, contactá a soporte.'
            )}
          </div>
        )}

        {/* Resumen */}
        {data && (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Transferencias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.total}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Monto Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ${(data.totalAmount / 100).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Mostrando</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{filteredTransfers.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Lista de Transferencias</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por referencia, factura o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="APLICADO">Aplicado</SelectItem>
                    <SelectItem value="PEND_LIQ">Pendiente Liquidación</SelectItem>
                    <SelectItem value="LIQUIDADO">Liquidado</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceSystemFilter} onValueChange={setSourceSystemFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los orígenes</SelectItem>
                    <SelectItem value="CRESIUM">Cresium</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando transferencias...</p>
              </div>
            ) : !data || filteredTransfers.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-gray-600">No hay transferencias para mostrar.</p>
                {(searchTerm || statusFilter !== 'all' || sourceSystemFilter !== 'all') && (
                  <p className="text-xs text-gray-500">Probá limpiar filtros o la búsqueda.</p>
                )}
                {SHOW_CRESIUM_DEBUG && data && data.total === 0 && !searchTerm && (
                  <div className="text-xs text-amber-900 max-w-2xl mx-auto space-y-2 text-left bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                    <p className="font-medium">Diagnóstico (solo dev)</p>
                    {session && (
                      <p>
                        <span className="text-gray-600">Tenant sesión:</span>{' '}
                        <code className="bg-amber-100 px-1 rounded break-all">{session.tenantId}</code>
                        {session.tenantName ? (
                          <span className="text-gray-600"> ({session.tenantName})</span>
                        ) : null}
                      </p>
                    )}
                    <ul className="list-disc pl-4 space-y-1 text-gray-700">
                      <li>
                        <code className="bg-amber-100 px-1">CRESIUM_TENANT_ID</code> (rail-cucuru) = mismo UUID.
                      </li>
                      <li>
                        Misma <code className="bg-amber-100 px-1">DATABASE_URL</code> que api-gateway.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3 md:hidden">
                  Vista resumida: deslizá hacia abajo para ver cada transferencia completa.
                </p>
                <p className="text-xs text-gray-500 mb-2 hidden md:block">
                  Si la tabla es ancha, usá el scroll horizontal debajo para ver fecha, monto y referencia.
                </p>

                {/* Móvil / pantalla angosta: tarjetas (evita que solo se vean Facturas + Acciones) */}
                <div className="space-y-3 md:hidden">
                  {filteredTransfers.map((transfer) => (
                    <Card key={transfer.id} className="border border-gray-200 shadow-sm">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Fecha</p>
                            <p className="text-sm font-medium">
                              {format(new Date(transfer.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Monto</p>
                            <p className="text-lg font-bold text-gray-900">
                              $
                              {(transfer.totalAmount / 100).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {getSourceSystemBadge(transfer.sourceSystem)}
                          {getStatusBadge(transfer.status)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Referencia</p>
                          <p className="font-mono text-sm break-all">{transfer.externalRef || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quién pagó / CVU</p>
                          <div className="text-sm space-y-1">
                            {transfer.payerCvu ? (
                              <p className="font-mono text-xs text-gray-800 break-all">
                                <span className="text-gray-500 font-sans">CVU: </span>
                                {transfer.payerCvu}
                              </p>
                            ) : null}
                            {transfer.payerCuit ? (
                              <p className="font-mono text-xs text-gray-800">
                                <span className="text-gray-500 font-sans">CUIT: </span>
                                {transfer.payerCuit}
                              </p>
                            ) : null}
                            {transfer.payerDisplayName ? (
                              <p className="font-medium">
                                {transfer.payerDisplayName}
                                <span className="block text-xs font-normal text-gray-500 font-sans mt-0.5">
                                  Nombre según aviso (verificá con CVU si no coincide)
                                </span>
                              </p>
                            ) : null}
                            {!transfer.payerCvu &&
                            !transfer.payerCuit &&
                            !transfer.payerDisplayName &&
                            transfer.imputedCustomerName ? (
                              <span>{transfer.imputedCustomerName} (cliente imputado)</span>
                            ) : null}
                            {!transfer.payerCvu &&
                            !transfer.payerCuit &&
                            !transfer.payerDisplayName &&
                            !transfer.imputedCustomerName &&
                            transfer.sourceSystem === 'CRESIUM' ? (
                              <span className="text-amber-800 text-sm">Sin CUIT, nombre ni CVU en el aviso</span>
                            ) : null}
                            {!transfer.payerCvu &&
                            !transfer.payerCuit &&
                            !transfer.payerDisplayName &&
                            !transfer.imputedCustomerName &&
                            transfer.sourceSystem !== 'CRESIUM' ? (
                              <span className="text-gray-400">—</span>
                            ) : null}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Factura / imputación</p>
                          {transfer.applications.length === 0 ? (
                            <p className="text-sm text-amber-700">
                              Sin imputación — completar en Conciliación.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {transfer.applications.map((app) => (
                                <div key={app.id} className="text-sm">
                                  <span className="text-gray-600">{app.invoice.customer?.razonSocial}</span>
                                  <Link
                                    href={`/invoices/${app.invoice.id}`}
                                    className="block text-emerald-600 font-medium hover:underline"
                                  >
                                    {app.invoice.numero}
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pt-1 border-t flex justify-end">
                          <Link href={`/payments/${transfer.id}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Escritorio: tabla con scroll horizontal */}
                <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-100">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50">
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Fecha</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Origen</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Referencia</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap min-w-[200px]">
                          Quién pagó / CVU
                        </TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Monto</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Estado</TableHead>
                        <TableHead className="font-semibold text-gray-800 min-w-[180px]">Facturas</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap w-[90px]">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(transfer.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell>{getSourceSystemBadge(transfer.sourceSystem)}</TableCell>
                          <TableCell className="font-mono text-sm max-w-[160px]">
                            <span className="break-all">{transfer.externalRef || '-'}</span>
                          </TableCell>
                          <TableCell className="text-sm max-w-[260px]">
                            <div className="space-y-1.5">
                              {transfer.payerCvu ? (
                                <p className="font-mono text-xs text-gray-900 break-all leading-snug">
                                  <span className="text-gray-500 font-sans">CVU </span>
                                  {transfer.payerCvu}
                                </p>
                              ) : null}
                              {transfer.payerCuit ? (
                                <p className="font-mono text-xs text-gray-900">
                                  <span className="text-gray-500 font-sans">CUIT </span>
                                  {transfer.payerCuit}
                                </p>
                              ) : null}
                              {transfer.payerDisplayName ? (
                                <div>
                                  <span className="font-medium text-gray-900">{transfer.payerDisplayName}</span>
                                  <span className="block text-[10px] text-gray-500 font-sans">
                                    Nombre según aviso
                                  </span>
                                </div>
                              ) : null}
                              {!transfer.payerCvu &&
                              !transfer.payerCuit &&
                              !transfer.payerDisplayName &&
                              transfer.imputedCustomerName ? (
                                <span className="text-gray-800">
                                  <span className="text-xs text-gray-500 block">Cliente (imputado)</span>
                                  {transfer.imputedCustomerName}
                                </span>
                              ) : null}
                              {!transfer.payerCvu &&
                              !transfer.payerCuit &&
                              !transfer.payerDisplayName &&
                              !transfer.imputedCustomerName &&
                              transfer.sourceSystem === 'CRESIUM' ? (
                                <span className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 inline-block">
                                  Sin CUIT, nombre ni CVU en el aviso
                                </span>
                              ) : null}
                              {!transfer.payerCvu &&
                              !transfer.payerCuit &&
                              !transfer.payerDisplayName &&
                              !transfer.imputedCustomerName &&
                              transfer.sourceSystem !== 'CRESIUM' ? (
                                <span className="text-gray-400">—</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                            ${(transfer.totalAmount / 100).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {transfer.applications.length === 0 ? (
                                <span className="text-sm text-amber-700">
                                  Sin imputación — Conciliación.
                                </span>
                              ) : (
                                transfer.applications.map((app) => (
                                  <div key={app.id} className="text-sm">
                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                      {app.invoice.customer?.razonSocial}
                                    </div>
                                    <Link
                                      href={`/invoices/${app.invoice.id}`}
                                      className="text-emerald-600 hover:text-emerald-800 hover:underline"
                                    >
                                      {app.invoice.numero}
                                    </Link>
                                    <span className="text-gray-500 ml-2">
                                      ${(app.amount / 100).toLocaleString('es-AR')}
                                    </span>
                                    {app.isAuthoritative && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        🔒 Autoritativo
                                      </Badge>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/payments/${transfer.id}`}>
                              <Button variant="ghost" size="sm" title="Ver detalle">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

