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
import { Search, Loader2, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface EcheqRow {
  id: string;
  sourceSystem: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
  settledAt: string | null;
  totalAmount: number;
  /** ID en API Cresium v3 si el webhook lo incluyó (GET /v3/transaction/{id}). */
  cresiumTransactionNumericId?: number | null;
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

export default function EcheqsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceSystemFilter, setSourceSystemFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cresiumDialogOpen, setCresiumDialogOpen] = useState(false);
  const [cresiumLoading, setCresiumLoading] = useState(false);
  const [cresiumPayload, setCresiumPayload] = useState<unknown>(null);
  const [cresiumError, setCresiumError] = useState<string | null>(null);
  const [cresiumQueryId, setCresiumQueryId] = useState<number | null>(null);

  const openCresiumTransaction = async (numericId: number) => {
    setCresiumQueryId(numericId);
    setCresiumDialogOpen(true);
    setCresiumLoading(true);
    setCresiumError(null);
    setCresiumPayload(null);
    try {
      const r = await api.get(`/v1/integrations/cresium/transaction/${numericId}`);
      setCresiumPayload(r.data);
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const data = ax.response?.data;
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : typeof data?.error === 'string'
            ? data.error
            : ax.message ?? 'Error al consultar Cresium';
      setCresiumError(msg);
    } finally {
      setCresiumLoading(false);
    }
  };

  const { data, isLoading, isError, error } = useQuery<{
    echeqs: EcheqRow[];
    total: number;
    totalAmount: number;
  }>({
    queryKey: ['payments-echeqs', statusFilter, sourceSystemFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (sourceSystemFilter !== 'all') {
        params.sourceSystem = sourceSystemFilter;
      }
      const response = await api.get('/v1/payments/echeqs', { params });
      return response.data;
    },
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

  const filteredEcheqs =
    data?.echeqs.filter((row) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const apps = row.applications ?? [];
        return (
          row.externalRef?.toLowerCase().includes(search) ||
          row.payerDisplayName?.toLowerCase().includes(search) ||
          row.payerCvu?.replace(/\s/g, '').includes(search.replace(/\s/g, '')) ||
          row.payerCuit?.replace(/[-\s]/g, '').includes(search.replace(/[-\s]/g, '')) ||
          row.imputedCustomerName?.toLowerCase().includes(search) ||
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            E-cheques
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Ingresos por e-cheque (Cresium). No incluye transferencias CVU: usá{' '}
            <Link href="/payments/transfers" className="text-violet-700 underline-offset-2 hover:underline">
              Transferencias bancarias
            </Link>
            .
          </p>
        </div>

        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>No pudimos cargar los e-cheques.</strong>{' '}
            {(error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error ??
              (error as Error)?.message ??
              'Intentá de nuevo en unos minutos.'}
          </div>
        )}

        {/* Resumen */}
        {data && (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total E-cheques</CardTitle>
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
                <div className="text-2xl font-bold text-white">{filteredEcheqs.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Lista de E-cheques</CardTitle>
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
                <p className="mt-2 text-sm text-gray-500">Cargando e-cheques...</p>
              </div>
            ) : !data || filteredEcheqs.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-sm text-gray-600">No hay e-cheques para mostrar.</p>
                {(searchTerm || statusFilter !== 'all' || sourceSystemFilter !== 'all') && (
                  <p className="text-xs text-gray-500">Probá limpiar filtros o la búsqueda.</p>
                )}
                {data && data.total === 0 && !searchTerm && statusFilter === 'all' && sourceSystemFilter === 'all' && (
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Los depósitos Cresium con tipo de transacción e-cheque se guardan con método{' '}
                    <code className="rounded bg-white px-1 border">ECHEQ</code> y aparecen aquí.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3 md:hidden">
                  Vista resumida: deslizá hacia abajo para ver cada e-cheque completo.
                </p>
                <p className="text-xs text-gray-500 mb-2 hidden md:block">
                  Si la tabla es ancha, usá el scroll horizontal debajo para ver fecha, monto y referencia.
                </p>

                {/* Móvil / pantalla angosta: tarjetas (evita que solo se vean Facturas + Acciones) */}
                <div className="space-y-3 md:hidden">
                  {filteredEcheqs.map((echeq) => (
                    <Card key={echeq.id} className="border border-gray-200 shadow-sm">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Fecha</p>
                            <p className="text-sm font-medium">
                              {format(new Date(echeq.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Monto</p>
                            <p className="text-lg font-bold text-gray-900">
                              $
                              {(echeq.totalAmount / 100).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          {getSourceSystemBadge(echeq.sourceSystem)}
                          {getStatusBadge(echeq.status)}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Referencia</p>
                          <p className="font-mono text-sm break-all">{echeq.externalRef || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quién pagó / CVU</p>
                          <div className="text-sm space-y-1">
                            {echeq.payerCvu ? (
                              <p className="font-mono text-xs text-gray-800 break-all">
                                <span className="text-gray-500 font-sans">CVU: </span>
                                {echeq.payerCvu}
                              </p>
                            ) : null}
                            {echeq.payerCuit ? (
                              <p className="font-mono text-xs text-gray-800">
                                <span className="text-gray-500 font-sans">CUIT: </span>
                                {echeq.payerCuit}
                              </p>
                            ) : null}
                            {echeq.payerDisplayName ? (
                              <p className="font-medium">
                                {echeq.payerDisplayName}
                                <span className="block text-xs font-normal text-gray-500 font-sans mt-0.5">
                                  Nombre según aviso (verificá con CVU si no coincide)
                                </span>
                              </p>
                            ) : null}
                            {!echeq.payerCvu &&
                            !echeq.payerCuit &&
                            !echeq.payerDisplayName &&
                            echeq.imputedCustomerName ? (
                              <span>{echeq.imputedCustomerName} (cliente imputado)</span>
                            ) : null}
                            {!echeq.payerCvu &&
                            !echeq.payerCuit &&
                            !echeq.payerDisplayName &&
                            !echeq.imputedCustomerName &&
                            echeq.sourceSystem === 'CRESIUM' ? (
                              <span className="text-amber-800 text-sm">Sin CUIT, nombre ni CVU en el aviso</span>
                            ) : null}
                            {!echeq.payerCvu &&
                            !echeq.payerCuit &&
                            !echeq.payerDisplayName &&
                            !echeq.imputedCustomerName &&
                            echeq.sourceSystem !== 'CRESIUM' ? (
                              <span className="text-gray-400">—</span>
                            ) : null}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Factura / imputación</p>
                          {echeq.applications.length === 0 ? (
                            <p className="text-sm text-amber-700">
                              Sin imputación — completar en Conciliación.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {echeq.applications.map((app) => (
                                <div key={app.id} className="text-sm">
                                  <span className="text-gray-600">{app.invoice.customer?.razonSocial}</span>
                                  <Link
                                    href={`/invoices/${app.invoice.id}`}
                                    className="block text-violet-600 font-medium hover:underline"
                                  >
                                    {app.invoice.numero}
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pt-1 border-t flex flex-wrap justify-end gap-2">
                          {echeq.cresiumTransactionNumericId != null ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="gap-2"
                              onClick={() => openCresiumTransaction(echeq.cresiumTransactionNumericId!)}
                            >
                              Transacción Cresium
                            </Button>
                          ) : null}
                          <Link href={`/payments/${echeq.id}`}>
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
                  <Table className="min-w-[1100px]">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-violet-50 to-indigo-50">
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Fecha</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Origen</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Referencia</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap min-w-[200px]">
                          Quién pagó / CVU
                        </TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Monto</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap">Estado</TableHead>
                        <TableHead className="font-semibold text-gray-800 min-w-[180px]">Facturas</TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap w-[120px]">
                          Cresium
                        </TableHead>
                        <TableHead className="font-semibold text-gray-800 whitespace-nowrap w-[90px]">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEcheqs.map((echeq) => (
                        <TableRow key={echeq.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(echeq.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell>{getSourceSystemBadge(echeq.sourceSystem)}</TableCell>
                          <TableCell className="font-mono text-sm max-w-[160px]">
                            <span className="break-all">{echeq.externalRef || '-'}</span>
                          </TableCell>
                          <TableCell className="text-sm max-w-[260px]">
                            <div className="space-y-1.5">
                              {echeq.payerCvu ? (
                                <p className="font-mono text-xs text-gray-900 break-all leading-snug">
                                  <span className="text-gray-500 font-sans">CVU </span>
                                  {echeq.payerCvu}
                                </p>
                              ) : null}
                              {echeq.payerCuit ? (
                                <p className="font-mono text-xs text-gray-900">
                                  <span className="text-gray-500 font-sans">CUIT </span>
                                  {echeq.payerCuit}
                                </p>
                              ) : null}
                              {echeq.payerDisplayName ? (
                                <div>
                                  <span className="font-medium text-gray-900">{echeq.payerDisplayName}</span>
                                  <span className="block text-[10px] text-gray-500 font-sans">
                                    Nombre según aviso
                                  </span>
                                </div>
                              ) : null}
                              {!echeq.payerCvu &&
                              !echeq.payerCuit &&
                              !echeq.payerDisplayName &&
                              echeq.imputedCustomerName ? (
                                <span className="text-gray-800">
                                  <span className="text-xs text-gray-500 block">Cliente (imputado)</span>
                                  {echeq.imputedCustomerName}
                                </span>
                              ) : null}
                              {!echeq.payerCvu &&
                              !echeq.payerCuit &&
                              !echeq.payerDisplayName &&
                              !echeq.imputedCustomerName &&
                              echeq.sourceSystem === 'CRESIUM' ? (
                                <span className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 inline-block">
                                  Sin CUIT, nombre ni CVU en el aviso
                                </span>
                              ) : null}
                              {!echeq.payerCvu &&
                              !echeq.payerCuit &&
                              !echeq.payerDisplayName &&
                              !echeq.imputedCustomerName &&
                              echeq.sourceSystem !== 'CRESIUM' ? (
                                <span className="text-gray-400">—</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                            ${(echeq.totalAmount / 100).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(echeq.status)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {echeq.applications.length === 0 ? (
                                <span className="text-sm text-amber-700">
                                  Sin imputación — Conciliación.
                                </span>
                              ) : (
                                echeq.applications.map((app) => (
                                  <div key={app.id} className="text-sm">
                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                      {app.invoice.customer?.razonSocial}
                                    </div>
                                    <Link
                                      href={`/invoices/${app.invoice.id}`}
                                      className="text-violet-600 hover:text-violet-800 hover:underline"
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
                          <TableCell className="align-top">
                            {echeq.cresiumTransactionNumericId != null ? (
                              <div className="flex flex-col gap-1.5">
                                <span className="font-mono text-xs text-gray-700">
                                  {echeq.cresiumTransactionNumericId}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openCresiumTransaction(echeq.cresiumTransactionNumericId!)}
                                >
                                  Ver transacción
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link href={`/payments/${echeq.id}`}>
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

        <Dialog open={cresiumDialogOpen} onOpenChange={setCresiumDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transacción Cresium (API v3)</DialogTitle>
              <DialogDescription>
                {cresiumQueryId != null ? (
                  <>ID {cresiumQueryId} — respuesta de la API Partner (proxy seguro desde el backend).</>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            {cresiumLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Consultando…
              </div>
            ) : cresiumError ? (
              <p className="text-sm text-red-700 whitespace-pre-wrap">{cresiumError}</p>
            ) : (
              <pre className="text-xs bg-muted/80 rounded-md p-4 overflow-x-auto font-mono">
                {JSON.stringify(cresiumPayload, null, 2)}
              </pre>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

