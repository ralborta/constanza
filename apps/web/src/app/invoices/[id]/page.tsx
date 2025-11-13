'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TimelineItem {
  type: 'CONTACT' | 'PROMISE' | 'PAYMENT';
  channel?: string;
  direction?: string;
  message?: string;
  status?: string;
  amount?: number;
  dueDate?: string;
  isAuthoritative?: boolean;
  sourceSystem?: string;
  appliedAt?: string;
  settledAt?: string;
  ts: string;
}

interface InvoiceDetail {
  invoice: {
    id: string;
    customer: {
      id: string;
      razonSocial: string;
      cuits: Array<{ cuit: string; isPrimary: boolean }>;
    };
    numero: string;
    monto: number;
    montoAplicado: number;
    fechaVto: string;
    estado: string;
    applications: Array<{
      id: string;
      amount: number;
      isAuthoritative: boolean;
      appliedAt: string;
      payment: {
        sourceSystem: string;
        method: string;
        status: string;
        settledAt?: string;
      };
    }>;
    timeline: TimelineItem[];
  };
}

function getStatusBadge(estado: string) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ABIERTA: { label: 'Por vencer', variant: 'secondary' },
    VENCIDA: { label: 'Vencido', variant: 'destructive' },
    PARCIAL: { label: 'Parcial', variant: 'outline' },
    PAGADA: { label: 'Pagada', variant: 'default' },
    PROGRAMADA: { label: 'Programado', variant: 'default' },
  };

  const status = statusMap[estado] || { label: estado, variant: 'outline' };
  return (
    <Badge variant={status.variant}>{status.label}</Badge>
  );
}

function getTimelineIcon(type: string, status?: string) {
  if (type === 'PAYMENT') {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  }
  if (type === 'PROMISE') {
    if (status === 'BROKEN') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    return <Clock className="h-5 w-5 text-yellow-600" />;
  }
  return <div className="h-2 w-2 rounded-full bg-blue-600" />;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const { data, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await api.get(`/v1/invoices/${invoiceId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-red-500">Factura no encontrada</p>
        </div>
      </MainLayout>
    );
  }

  const { invoice } = data;

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Factura {invoice.numero}</h1>
        </div>

        {/* Información de la factura */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información de la Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
                <p className="text-lg font-medium text-gray-900">{invoice.customer.razonSocial}</p>
                {invoice.customer.cuits.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    CUIT: {invoice.customer.cuits.find((c) => c.isPrimary)?.cuit}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Monto Total</h3>
                <p className="text-2xl font-bold text-gray-900">
                  ${(invoice.monto / 100).toLocaleString('es-AR')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Aplicado: ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Vencimiento</h3>
                <p className="text-lg text-gray-900">
                  {format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Estado</h3>
                <div>{getStatusBadge(invoice.estado)}</div>
              </div>
            </div>

            {/* Badges de aplicaciones */}
            {invoice.applications.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Aplicaciones</h3>
                <div className="flex flex-wrap gap-2">
                  {invoice.applications.map((app) => (
                    <Badge
                      key={app.id}
                      variant={app.isAuthoritative ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      {app.isAuthoritative ? (
                        <>
                          Aplicado por {app.payment.sourceSystem} 🔒
                        </>
                      ) : (
                        <>
                          Aplicado (pend. acreditación {app.payment.method})
                        </>
                      )}
                      {' '}
                      ${(app.amount / 100).toLocaleString('es-AR')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline de Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {invoice.timeline.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay eventos en el timeline</p>
              ) : (
                invoice.timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getTimelineIcon(item.type, item.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          {item.type === 'CONTACT' && (
                            <p className="text-sm font-medium text-gray-900">
                              {item.channel} - {item.direction}
                            </p>
                          )}
                          {item.type === 'PROMISE' && (
                            <p className="text-sm font-medium text-gray-900">
                              Promesa de pago
                              {item.dueDate && (
                                <span className="ml-2 text-xs text-gray-500">
                                  (Vence: {format(new Date(item.dueDate), 'dd/MM/yyyy')})
                                </span>
                              )}
                            </p>
                          )}
                          {item.type === 'PAYMENT' && (
                            <p className="text-sm font-medium text-gray-900">
                              Pago aplicado
                              {item.isAuthoritative && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  Autoritativo ({item.sourceSystem})
                                </Badge>
                              )}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      {item.message && (
                        <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                      )}
                      {item.amount && (
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          Monto: ${(item.amount / 100).toLocaleString('es-AR')}
                        </p>
                      )}
                      {item.status && (
                        <Badge
                          variant={
                            item.status === 'SENT' || item.status === 'DELIVERED'
                              ? 'default'
                              : item.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="mt-2"
                        >
                          {item.status}
                        </Badge>
                      )}
                      {item.appliedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Aplicado: {format(new Date(item.appliedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                      {item.settledAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Liquidado: {format(new Date(item.settledAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
