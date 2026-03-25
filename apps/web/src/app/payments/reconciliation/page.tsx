'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConciliationCandidate {
  invoiceId: string;
  numero: string;
  customerName: string;
  pendingCents: number;
  exactAmountMatch: boolean;
}

interface PendingPayment {
  id: string;
  sourceSystem: string;
  method: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
  totalAmount: number;
  applications: Array<{
    invoice: {
      numero: string;
      customer: string;
    };
    amount: number;
    isAuthoritative: boolean;
  }>;
  metadata?: unknown;
  extractedTaxIds?: string[] | null;
  candidates?: ConciliationCandidate[];
}

interface ReconciliationSummary {
  pendingLiquidation: {
    count: number;
    totalAmount: number;
  };
  authoritative: {
    count: number;
    totalAmount: number;
  };
  manual: {
    count: number;
    totalAmount: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [reconcileAction, setReconcileAction] = useState<'LIQUIDATE' | 'REJECT' | null>(null);
  const [imputeInvoiceByPayment, setImputeInvoiceByPayment] = useState<Record<string, string>>({});
  const [cvuDraft, setCvuDraft] = useState('');

  const { data: tenantCresium } = useQuery({
    queryKey: ['tenant-cresium'],
    queryFn: async () => {
      const r = await api.get('/v1/tenant/cresium');
      return r.data as { cresiumCvuCobro: string | null };
    },
  });

  const patchCvuMutation = useMutation({
    mutationFn: async (cresiumCvuCobro: string | null) => {
      const r = await api.patch('/v1/tenant/cresium', { cresiumCvuCobro: cresiumCvuCobro ?? null });
      return r.data;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-cresium'] });
      if (vars === null) setCvuDraft('');
      else if (typeof vars === 'string') setCvuDraft(vars);
    },
  });

  useEffect(() => {
    if (tenantCresium?.cresiumCvuCobro) setCvuDraft(tenantCresium.cresiumCvuCobro);
  }, [tenantCresium?.cresiumCvuCobro]);

  const { data, isLoading } = useQuery<{
    pendingLiquidation: PendingPayment[];
    summary: ReconciliationSummary;
  }>({
    queryKey: ['payments-reconciliation'],
    queryFn: async () => {
      const response = await api.get('/v1/payments/reconciliation');
      return response.data;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const imputeMutation = useMutation({
    mutationFn: async ({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) => {
      const r = await api.post(`/v1/payments/${paymentId}/impute`, { invoiceId });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async (data: { paymentId: string; action: 'LIQUIDATE' | 'REJECT' }) => {
      const response = await api.post('/v1/payments/reconcile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['payments-transfers'] });
      setSelectedPaymentId(null);
      setReconcileAction(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PEND_LIQ':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente Liquidación
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

  const handleReconcile = (paymentId: string, action: 'LIQUIDATE' | 'REJECT') => {
    setSelectedPaymentId(paymentId);
    setReconcileAction(action);
    reconcileMutation.mutate({ paymentId, action });
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Conciliación de Pagos
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona la liquidación y conciliación de pagos pendientes
            </p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['payments-reconciliation'] })}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-800">CVU de cobro (Cresium)</CardTitle>
            <p className="text-xs text-gray-600">
              Debe coincidir con el CVU de la empresa en Cresium. Solo administradores pueden guardar.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">CVU (solo dígitos)</Label>
              <Input
                className="w-64 font-mono text-sm"
                placeholder="0000000000000000222222"
                value={cvuDraft}
                onChange={(e) => setCvuDraft(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const d = cvuDraft.replace(/\D/g, '');
                if (d.length < 8) {
                  window.alert('El CVU debe tener al menos 8 dígitos.');
                  return;
                }
                patchCvuMutation.mutate(d);
              }}
              disabled={patchCvuMutation.isPending}
            >
              Guardar CVU
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => patchCvuMutation.mutate(null)}
              disabled={patchCvuMutation.isPending}
            >
              Borrar
            </Button>
            {patchCvuMutation.isError && (
              <span className="text-xs text-red-600">
                {(patchCvuMutation.error as any)?.response?.data?.error || 'Error al guardar'}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Resumen */}
        {data?.summary && (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Pendientes Liquidación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {data.summary.pendingLiquidation.count}
                </div>
                <div className="text-sm text-white/80 mt-1">
                  ${(data.summary.pendingLiquidation.totalAmount / 100).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Autoritativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.authoritative.count}</div>
                <div className="text-sm text-white/80 mt-1">
                  ${(data.summary.authoritative.totalAmount / 100).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-500 to-slate-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Manuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.manual.count}</div>
                <div className="text-sm text-white/80 mt-1">
                  ${(data.summary.manual.totalAmount / 100).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {data.summary.statusBreakdown.reduce((sum, s) => sum + s.count, 0)}
                </div>
                <div className="text-xs text-white/80 mt-1">
                  {data.summary.statusBreakdown.map((s) => `${s.status}: ${s.count}`).join(', ')}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-gray-800">Pagos Pendientes de Liquidación</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando pagos...</p>
              </div>
            ) : !data || data.pendingLiquidation.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                <p className="mt-2 text-sm text-gray-500">
                  No hay pagos pendientes de liquidación
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <TableHead className="font-semibold text-gray-800">Fecha</TableHead>
                    <TableHead className="font-semibold text-gray-800">Origen</TableHead>
                    <TableHead className="font-semibold text-gray-800">Método</TableHead>
                    <TableHead className="font-semibold text-gray-800">Referencia</TableHead>
                    <TableHead className="font-semibold text-gray-800">Monto</TableHead>
                    <TableHead className="font-semibold text-gray-800">Estado</TableHead>
                    <TableHead className="font-semibold text-gray-800">Facturas</TableHead>
                    <TableHead className="font-semibold text-gray-800 min-w-[240px]">Imputar (Cresium)</TableHead>
                    <TableHead className="font-semibold text-gray-800">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pendingLiquidation.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>{getSourceSystemBadge(payment.sourceSystem)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.externalRef || '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        ${(payment.totalAmount / 100).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {payment.applications.length === 0 ? (
                            <span className="text-sm text-amber-700">
                              Sin factura — imputar vía API antes de liquidar
                            </span>
                          ) : (
                            payment.applications.map((app, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="text-gray-900">{app.invoice.numero}</span>
                                <span className="text-gray-500 ml-2">
                                  ${(app.amount / 100).toLocaleString('es-AR')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.sourceSystem === 'CRESIUM' &&
                        payment.applications.length === 0 &&
                        (payment.candidates?.length ?? 0) > 0 ? (
                          <div className="space-y-2 max-w-xs">
                            {(payment.extractedTaxIds?.length ?? 0) > 0 && (
                              <p className="text-[10px] text-gray-500 font-mono">
                                CUIT detectados: {payment.extractedTaxIds?.join(', ')}
                              </p>
                            )}
                            <Select
                              value={imputeInvoiceByPayment[payment.id] || ''}
                              onValueChange={(v) =>
                                setImputeInvoiceByPayment((s) => ({ ...s, [payment.id]: v }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Elegir factura" />
                              </SelectTrigger>
                              <SelectContent>
                                {payment.candidates!.map((c) => (
                                  <SelectItem key={c.invoiceId} value={c.invoiceId}>
                                    {c.numero} · {c.customerName.slice(0, 24)}
                                    {c.exactAmountMatch ? ' · ✓ monto' : ''} · $
                                    {(c.pendingCents / 100).toLocaleString('es-AR', {
                                      minimumFractionDigits: 2,
                                    })}{' '}
                                    pend.
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              disabled={
                                !imputeInvoiceByPayment[payment.id] || imputeMutation.isPending
                              }
                              onClick={() =>
                                imputeMutation.mutate({
                                  paymentId: payment.id,
                                  invoiceId: imputeInvoiceByPayment[payment.id],
                                })
                              }
                            >
                              {imputeMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Imputar'
                              )}
                            </Button>
                          </div>
                        ) : payment.sourceSystem === 'CRESIUM' && payment.applications.length === 0 ? (
                          <span className="text-xs text-gray-400">Sin candidatos automáticos</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                disabled={
                                  payment.applications.length === 0 ||
                                  (reconcileMutation.isPending &&
                                    selectedPaymentId === payment.id &&
                                    reconcileAction === 'LIQUIDATE')
                                }
                                title={
                                  payment.applications.length === 0
                                    ? 'Imputá primero el pago a una factura'
                                    : undefined
                                }
                              >
                                {reconcileMutation.isPending &&
                                selectedPaymentId === payment.id &&
                                reconcileAction === 'LIQUIDATE' ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                Liquidar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Liquidación</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas liquidar este pago? Esta acción marcará
                                  el pago como liquidado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReconcile(payment.id, 'LIQUIDATE')}
                                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={
                                  reconcileMutation.isPending &&
                                  selectedPaymentId === payment.id &&
                                  reconcileAction === 'REJECT'
                                }
                              >
                                {reconcileMutation.isPending &&
                                selectedPaymentId === payment.id &&
                                reconcileAction === 'REJECT' ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4" />
                                )}
                                Rechazar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas rechazar este pago? Esta acción
                                  marcará el pago como rechazado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleReconcile(payment.id, 'REJECT')}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {reconcileMutation.isSuccess && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Pago {reconcileAction === 'LIQUIDATE' ? 'liquidado' : 'rechazado'} exitosamente
                </AlertDescription>
              </Alert>
            )}

            {reconcileMutation.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {(reconcileMutation.error as any)?.response?.data?.error ||
                    'Error al reconciliar el pago'}
                </AlertDescription>
              </Alert>
            )}

            {imputeMutation.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {(imputeMutation.error as any)?.response?.data?.error || 'Error al imputar'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

