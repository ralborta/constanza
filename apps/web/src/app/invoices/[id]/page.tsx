'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, XCircle, Envelope, ChatTeardrop, Phone, CurrencyDollar, Calendar, User, FileText, Sparkle, ArrowClockwise, TrendUp, ClockCounterClockwise, Robot, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InvoiceChat } from '@/components/invoices/invoice-chat';
import { InvoiceHistorialDrawer } from '@/components/invoices/invoice-historial-drawer';

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
  const map: Record<string, { label: string; className: string }> = {
    ABIERTA:    { label: 'Por vencer', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
    VENCIDA:    { label: 'Vencido',    className: 'bg-red-50 text-red-700 border border-red-200' },
    PARCIAL:    { label: 'Parcial',    className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    PAGADA:     { label: 'Pagada',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    SALDADA:    { label: 'Pagada',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    PROGRAMADA: { label: 'Programado', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  };
  const s = map[estado] || { label: estado, className: '' };
  return <Badge className={`font-medium text-xs ${s.className}`}>{s.label}</Badge>;
}

function getTimelineIcon(type: string, channel?: string, status?: string) {
  const isFailed = status === 'FAILED';
  const isOk = status === 'SENT' || status === 'DELIVERED';
  const channelUpper = channel?.toUpperCase() || '';

  if (type === 'PAYMENT') {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-400 flex-shrink-0">
        <CurrencyDollar size={16} weight="duotone" className="text-emerald-600" />
      </div>
    );
  }
  if (type === 'PROMISE') {
    if (status === 'BROKEN') {
      return (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-50 border-2 border-red-400 flex-shrink-0">
          <XCircle size={16} weight="duotone" className="text-red-600" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-50 border-2 border-amber-400 flex-shrink-0">
        <Clock size={16} weight="duotone" className="text-amber-600" />
      </div>
    );
  }

  if (channelUpper === 'EMAIL') {
    return (
      <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0 ${isFailed ? 'bg-red-50 border-red-400' : isOk ? 'bg-blue-50 border-blue-400' : 'bg-muted border-border'}`}>
        <Envelope size={16} weight="duotone" className={`${isFailed ? 'text-red-600' : isOk ? 'text-blue-600' : 'text-muted-foreground'}`} />
      </div>
    );
  }
  if (channelUpper === 'WHATSAPP') {
    return (
      <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0 ${isFailed ? 'bg-red-50 border-red-400' : isOk ? 'bg-emerald-50 border-emerald-400' : 'bg-muted border-border'}`}>
        <ChatTeardrop size={16} weight="duotone" className={`${isFailed ? 'text-red-600' : isOk ? 'text-emerald-600' : 'text-muted-foreground'}`} />
      </div>
    );
  }
  if (channelUpper === 'VOICE') {
    return (
      <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 flex-shrink-0 ${isFailed ? 'bg-red-50 border-red-400' : isOk ? 'bg-violet-50 border-violet-400' : 'bg-muted border-border'}`}>
        <Phone size={16} weight="duotone" className={`${isFailed ? 'text-red-600' : isOk ? 'text-violet-600' : 'text-muted-foreground'}`} />
      </div>
    );
  }
  if (channelUpper === 'AI' || channelUpper === 'AGENT') {
    return (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/40 flex-shrink-0">
        <Robot size={16} weight="duotone" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted border-2 border-border flex-shrink-0">
      <FileText size={16} weight="duotone" className="text-muted-foreground" />
    </div>
  );
}

function getStatusChip(status?: string) {
  if (!status) return null;
  const map: Record<string, string> = {
    SENT:      'bg-blue-50 text-blue-700 border-blue-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED:    'bg-red-50 text-red-700 border-red-200',
    READ:      'bg-primary/10 text-primary border-primary/20',
  };
  const labels: Record<string, string> = {
    SENT: 'Enviado', DELIVERED: 'Entregado', FAILED: 'Fallido', READ: 'Leído',
  };
  const cls = map[status] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {labels[status] || status}
    </span>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);

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
    retry: false,
  });

  const handleUpdateSummary = async () => {
    setIsUpdatingSummary(true);
    try {
      await api.post(`/v1/invoices/${invoiceId}/summary/update`);
      await refetchSummary();
    } catch (error: any) {
      console.error('Error actualizando resumen:', error);
      alert(`Error al actualizar resumen: ${error.response?.data?.message || error.message || 'Error desconocido'}`);
    } finally {
      setIsUpdatingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-sm text-destructive">Factura no encontrada</p>
        </div>
      </MainLayout>
    );
  }

  const { invoice } = data;

  return (
    <MainLayout>
      <div className="p-8">
        {/* Back + Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={16} weight="regular" className="mr-1.5" />
            Volver al Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono">Factura {invoice.numero}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{invoice.customer.razonSocial}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistorialOpen(true)}
              className="gap-2 text-sm"
            >
              <ClockCounterClockwise size={16} weight="duotone" className="mr-2" />
              Historial completo
            </Button>
          </div>
        </div>

        {/* Info de la factura */}
        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText size={16} weight="duotone" className="text-primary" />
              </div>
              <CardTitle className="text-base font-semibold text-foreground">Información de la Factura</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Cliente */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                  <User size={16} weight="duotone" className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-foreground truncate">{invoice.customer.razonSocial}</p>
                  {invoice.customer.cuits.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">CUIT: {invoice.customer.cuits.find((c) => c.isPrimary)?.cuit}</p>
                  )}
                </div>
              </div>

              {/* Monto */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 flex-shrink-0">
                  <CurrencyDollar size={16} weight="duotone" className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Monto Total</p>
                  <p className="text-xl font-bold text-foreground font-mono">${(invoice.monto / 100).toLocaleString('es-AR')}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    Aplicado: ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>

              {/* Vencimiento */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
                  <Calendar size={16} weight="duotone" className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Vencimiento</p>
                  <p className="text-sm font-semibold text-foreground">{format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <CheckCircle size={16} weight="duotone" className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Estado</p>
                  <div className="mt-1">{getStatusBadge(invoice.estado)}</div>
                </div>
              </div>
            </div>

            {invoice.applications.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Aplicaciones de pago</p>
                <div className="flex flex-wrap gap-2">
                  {invoice.applications.map((app) => (
                    <span
                      key={app.id}
                      className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium ${app.isAuthoritative ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}
                    >
                      {app.isAuthoritative ? `Aplicado por ${app.payment.sourceSystem} — ` : 'Pend. acreditación — '}
                      ${(app.amount / 100).toLocaleString('es-AR')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen Inteligente */}
        <Card className="mb-6 border border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <Sparkle size={16} weight="duotone" className="text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Resumen Inteligente</CardTitle>
                  {summaryData?.generatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generado: {format(new Date(summaryData.generatedAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleUpdateSummary}
                disabled={isUpdatingSummary}
                variant="outline"
                size="sm"
                className="text-sm gap-2"
              >
                <ArrowClockwise size={14} weight="regular" className={`${isUpdatingSummary ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {summaryLoading ? (
              <div className="text-center py-8">
              <Sparkle size={32} weight="duotone" className="text-violet-300 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Generando resumen...</p>
              </div>
            ) : summaryData?.summary ? (
              <div className="space-y-5">
                <div className="p-4 bg-primary/5 rounded-lg border-l-3 border-l-4 border-primary/40">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summaryData.summary.summary}</p>
                </div>

                {summaryData.summary.keyPoints?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendUp size={14} weight="duotone" className="text-primary" />
                      Puntos Clave
                    </h3>
                    <ul className="space-y-2">
                      {summaryData.summary.keyPoints?.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-primary font-bold mt-0.5 flex-shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(summaryData.summary.nextSteps?.length ?? 0) > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                      <Clock size={14} weight="duotone" className="text-amber-600" />
                      Próximos Pasos Sugeridos
                    </h3>
                    <ul className="space-y-2">
                      {summaryData.summary.nextSteps?.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="text-amber-600 font-bold mt-0.5 flex-shrink-0">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summaryData.summary.sentiment && (
                  <div className="pt-4 border-t border-border">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      summaryData.summary.sentiment === 'positive'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : summaryData.summary.sentiment === 'negative'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      Sentimiento: {summaryData.summary.sentiment === 'positive' ? 'Positivo' : summaryData.summary.sentiment === 'negative' ? 'Negativo' : 'Neutral'}
                    </span>
                  </div>
                )}
              </div>
            ) : summaryError ? (
              <div className="text-center py-8">
              <Sparkle size={32} weight="duotone" className="text-amber-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-700">Error al generar resumen</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(summaryError as any)?.response?.data?.message || (summaryError as any)?.message || 'Error desconocido'}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
              <Sparkle size={32} weight="duotone" className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No hay resumen disponible</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Haz clic en &quot;Actualizar&quot; para generar uno</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline y Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock size={16} weight="duotone" className="text-primary" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">Timeline de Eventos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 max-h-[600px] overflow-y-auto">
              {invoice.timeline.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={40} weight="duotone" className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No hay eventos en el timeline</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Los eventos aparecerán cuando se envíen mensajes</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-5">
                    {invoice.timeline.map((item, index) => (
                      <div key={index} className="relative flex items-start gap-4">
                        <div className="relative z-10">{getTimelineIcon(item.type, item.channel, item.status)}</div>
                        <div className="flex-1 min-w-0 rounded-lg border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex-1">
                              {item.type === 'CONTACT' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground">
                                    {item.channel} {item.direction ? `— ${item.direction}` : ''}
                                  </p>
                                  {getStatusChip(item.status)}
                                </div>
                              )}
                              {item.type === 'PROMISE' && (
                                <p className="text-sm font-semibold text-foreground">
                                  Promesa de pago
                                  {item.dueDate && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                                      Vence: {format(new Date(item.dueDate), 'dd/MM/yyyy')}
                                    </span>
                                  )}
                                </p>
                              )}
                              {item.type === 'PAYMENT' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-foreground">Pago aplicado</p>
                                  {item.isAuthoritative && (
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700 border-emerald-200">
                                      {item.sourceSystem}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {format(new Date(item.ts), 'dd/MM HH:mm')}
                            </p>
                          </div>

                          {item.message && (
                            <div className="mt-3 p-3 bg-muted/40 rounded-md border-l-2 border-primary/40">
                              <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
                            </div>
                          )}

                          {item.amount && (
                            <div className="mt-3 flex items-center gap-1.5">
                              <CurrencyDollar size={14} weight="duotone" className="text-emerald-600" />
                              <p className="text-sm font-semibold text-foreground font-mono">
                                ${(item.amount / 100).toLocaleString('es-AR')}
                              </p>
                            </div>
                          )}

                          {(item.appliedAt || item.settledAt) && (
                            <div className="mt-3 pt-3 border-t border-border space-y-1">
                              {item.appliedAt && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Aplicado:</span> {format(new Date(item.appliedAt), 'dd/MM/yyyy HH:mm')}
                                </p>
                              )}
                              {item.settledAt && (
                                <p className="text-xs text-muted-foreground">
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

          {/* Chat */}
          <div className="h-[600px]">
            <InvoiceChat invoiceId={invoiceId} />
          </div>
        </div>

        <InvoiceHistorialDrawer
          invoiceId={invoiceId}
          open={historialOpen}
          onOpenChange={setHistorialOpen}
        />
      </div>
    </MainLayout>
  );
}
