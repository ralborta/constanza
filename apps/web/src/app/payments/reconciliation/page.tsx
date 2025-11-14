'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
      case 'CUCURU':
        return <Badge className="bg-blue-100 text-blue-700">Cucuru</Badge>;
      case 'BINDX':
        return <Badge className="bg-purple-100 text-purple-700">BindX</Badge>;
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
                          {payment.applications.map((app, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-gray-900">{app.invoice.numero}</span>
                              <span className="text-gray-500 ml-2">
                                ${(app.amount / 100).toLocaleString('es-AR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                disabled={
                                  reconcileMutation.isPending &&
                                  selectedPaymentId === payment.id &&
                                  reconcileAction === 'LIQUIDATE'
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

