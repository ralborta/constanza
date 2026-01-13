'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Clock, XCircle, Mail, MessageSquare, Phone, DollarSign, Calendar, User, FileText, Sparkles, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InvoiceChat } from '@/components/invoices/invoice-chat';

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

interface InvoiceSummary {
  summary: string;
  keyPoints: string[];
  nextSteps?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
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

function getTimelineIcon(type: string, channel?: string, status?: string) {
  if (type === 'PAYMENT') {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 border-2 border-green-500">
        <DollarSign className="h-5 w-5 text-green-600" />
      </div>
    );
  }
  if (type === 'PROMISE') {
    if (status === 'BROKEN') {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 border-2 border-red-500">
          <XCircle className="h-5 w-5 text-red-600" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 border-2 border-yellow-500">
        <Clock className="h-5 w-5 text-yellow-600" />
      </div>
    );
  }
  
  // Para CONTACT, usar iconos según el canal
  const channelUpper = channel?.toUpperCase() || '';
  if (channelUpper === 'EMAIL') {
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
        status === 'FAILED' 
          ? 'bg-red-100 border-red-500' 
          : status === 'SENT' || status === 'DELIVERED'
          ? 'bg-blue-100 border-blue-500'
          : 'bg-gray-100 border-gray-400'
      }`}>
        <Mail className={`h-5 w-5 ${
          status === 'FAILED' 
            ? 'text-red-600' 
            : status === 'SENT' || status === 'DELIVERED'
            ? 'text-blue-600'
            : 'text-gray-600'
        }`} />
      </div>
    );
  }
  if (channelUpper === 'WHATSAPP') {
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
        status === 'FAILED' 
          ? 'bg-red-100 border-red-500' 
          : status === 'SENT' || status === 'DELIVERED'
          ? 'bg-green-100 border-green-500'
          : 'bg-gray-100 border-gray-400'
      }`}>
        <MessageSquare className={`h-5 w-5 ${
          status === 'FAILED' 
            ? 'text-red-600' 
            : status === 'SENT' || status === 'DELIVERED'
            ? 'text-green-600'
            : 'text-gray-600'
        }`} />
      </div>
    );
  }
  if (channelUpper === 'VOICE') {
    return (
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
        status === 'FAILED' 
          ? 'bg-red-100 border-red-500' 
          : status === 'SENT' || status === 'DELIVERED'
          ? 'bg-purple-100 border-purple-500'
          : 'bg-gray-100 border-gray-400'
      }`}>
        <Phone className={`h-5 w-5 ${
          status === 'FAILED' 
            ? 'text-red-600' 
            : status === 'SENT' || status === 'DELIVERED'
            ? 'text-purple-600'
            : 'text-gray-600'
        }`} />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-400">
      <FileText className="h-5 w-5 text-gray-600" />
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false);

  const { data, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await api.get(`/v1/invoices/${invoiceId}`);
      return response.data;
    },
  });

  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<{
    invoiceId: string;
    summary: InvoiceSummary;
    generatedAt: string;
  }>({
    queryKey: ['invoice-summary', invoiceId],
    queryFn: async () => {
      const response = await api.get(`/v1/invoices/${invoiceId}/summary`);
      return response.data;
    },
    enabled: !!invoiceId,
    retry: false, // No reintentar si falla
  });

  const handleUpdateSummary = async () => {
    setIsUpdatingSummary(true);
    try {
      await api.post(`/v1/invoices/${invoiceId}/summary/update`);
      await refetchSummary();
    } catch (error: any) {
      console.error('Error actualizando resumen:', error);
      // Mostrar error al usuario
      alert(`Error al actualizar resumen: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
    } finally {
      setIsUpdatingSummary(false);
    }
  };

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Factura {invoice.numero}
          </h1>
        </div>

        {/* Información de la factura */}
        <Card className="mb-6 border-0 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Factura
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Cliente</h3>
                  <p className="text-lg font-semibold text-gray-900 truncate">{invoice.customer.razonSocial}</p>
                  {invoice.customer.cuits.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      CUIT: {invoice.customer.cuits.find((c) => c.isPrimary)?.cuit}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Monto Total</h3>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ${(invoice.monto / 100).toLocaleString('es-AR')}
                  </p>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    Aplicado: ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Vencimiento</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado</h3>
                  <div className="mt-1">{getStatusBadge(invoice.estado)}</div>
                </div>
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

        {/* Resumen Inteligente */}
        <Card className="mb-6 border-0 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Resumen Inteligente
              </CardTitle>
              <Button
                onClick={handleUpdateSummary}
                disabled={isUpdatingSummary}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingSummary ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {summaryLoading ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-indigo-300 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-500">Generando resumen...</p>
              </div>
            ) : summaryData?.summary ? (
              <div className="space-y-6">
                {/* Resumen principal */}
                <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {summaryData.summary.summary}
                  </p>
                </div>

                {/* Puntos clave */}
                {summaryData.summary.keyPoints && summaryData.summary.keyPoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      Puntos Clave
                    </h3>
                    <ul className="space-y-2">
                      {summaryData.summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-indigo-600 font-bold mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Próximos pasos */}
                {summaryData.summary.nextSteps && summaryData.summary.nextSteps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      Próximos Pasos Sugeridos
                    </h3>
                    <ul className="space-y-2">
                      {summaryData.summary.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-orange-600 font-bold mt-0.5">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sentiment badge */}
                {summaryData.summary.sentiment && (
                  <div className="pt-4 border-t">
                    <Badge
                      variant={
                        summaryData.summary.sentiment === 'positive'
                          ? 'default'
                          : summaryData.summary.sentiment === 'negative'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      Sentimiento: {
                        summaryData.summary.sentiment === 'positive'
                          ? 'Positivo'
                          : summaryData.summary.sentiment === 'negative'
                          ? 'Negativo'
                          : 'Neutral'
                      }
                    </Badge>
                  </div>
                )}

                {summaryData.generatedAt && (
                  <p className="text-xs text-gray-400 mt-4">
                    Generado: {format(new Date(summaryData.generatedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
            ) : summaryError ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-orange-300 mx-auto mb-2" />
                <p className="text-orange-600 font-medium">Error al generar resumen</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(summaryError as any)?.response?.data?.message || 
                   (summaryError as any)?.message || 
                   'Error desconocido'}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Verifica que OPENAI_API_KEY esté configurada en el servidor
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No hay resumen disponible</p>
                <p className="text-sm text-gray-400 mt-1">Haz clic en &quot;Actualizar&quot; para generar uno</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline y Chat en grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 max-h-[600px] overflow-y-auto">
              {invoice.timeline.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay eventos en el timeline</p>
                  <p className="text-sm text-gray-400 mt-1">Los eventos aparecerán aquí cuando se envíen mensajes</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="space-y-6">
                    {invoice.timeline.map((item, index) => (
                      <div key={index} className="relative flex items-start gap-4 pl-2">
                        {/* Icono del timeline */}
                        <div className="relative z-10 flex-shrink-0">
                          {getTimelineIcon(item.type, item.channel, item.status)}
                        </div>
                        
                        {/* Contenido del evento */}
                        <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              {item.type === 'CONTACT' && (
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {item.channel} - {item.direction}
                                  </p>
                                  {item.status && (
                                    <Badge
                                      variant={
                                        item.status === 'SENT' || item.status === 'DELIVERED'
                                          ? 'default'
                                          : item.status === 'FAILED'
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {item.status === 'SENT' ? 'Enviado' : 
                                       item.status === 'DELIVERED' ? 'Entregado' :
                                       item.status === 'FAILED' ? 'Fallido' : item.status}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {item.type === 'PROMISE' && (
                                <p className="text-sm font-semibold text-gray-900">
                                  Promesa de pago
                                  {item.dueDate && (
                                    <span className="ml-2 text-xs text-gray-500 font-normal">
                                      (Vence: {format(new Date(item.dueDate), 'dd/MM/yyyy')})
                                    </span>
                                  )}
                                </p>
                              )}
                              {item.type === 'PAYMENT' && (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">Pago aplicado</p>
                                  {item.isAuthoritative && (
                                    <Badge variant="default" className="text-xs">
                                      Autoritativo ({item.sourceSystem})
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 whitespace-nowrap font-medium">
                              {format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          
                          {item.message && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md border-l-4 border-blue-500">
                              <p className="text-sm text-gray-700 leading-relaxed">{item.message}</p>
                            </div>
                          )}
                          
                          {item.amount && (
                            <div className="mt-3 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <p className="text-sm font-semibold text-gray-900">
                                Monto: ${(item.amount / 100).toLocaleString('es-AR')}
                              </p>
                            </div>
                          )}
                          
                          {(item.appliedAt || item.settledAt) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                              {item.appliedAt && (
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Aplicado:</span> {format(new Date(item.appliedAt), 'dd/MM/yyyy HH:mm')}
                                </p>
                              )}
                              {item.settledAt && (
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Liquidado:</span> {format(new Date(item.settledAt), 'dd/MM/yyyy HH:mm')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat con Constanza */}
          <div className="h-[600px]">
            <InvoiceChat invoiceId={invoiceId} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
