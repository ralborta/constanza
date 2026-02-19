'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  RefreshCw,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

export interface TimelineItem {
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

export interface InvoiceHistorialData {
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
  const status = statusMap[estado] || { label: estado, variant: 'outline' as const };
  return <Badge variant={status.variant}>{status.label}</Badge>;
}

function getTimelineIcon(type: string, channel?: string, status?: string) {
  if (type === 'PAYMENT') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-green-500 bg-green-100">
        <DollarSign className="h-5 w-5 text-green-600" />
      </div>
    );
  }
  if (type === 'PROMISE') {
    if (status === 'BROKEN') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-red-500 bg-red-100">
          <XCircle className="h-5 w-5 text-red-600" />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-yellow-500 bg-yellow-100">
        <Clock className="h-5 w-5 text-yellow-600" />
      </div>
    );
  }
  const ch = (channel ?? '').toUpperCase();
  if (ch === 'EMAIL') {
    return (
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          status === 'FAILED'
            ? 'border-red-500 bg-red-100'
            : status === 'SENT' || status === 'DELIVERED'
              ? 'border-blue-500 bg-blue-100'
              : 'border-gray-400 bg-gray-100'
        }`}
      >
        <Mail className={`h-5 w-5 ${status === 'FAILED' ? 'text-red-600' : status === 'SENT' || status === 'DELIVERED' ? 'text-blue-600' : 'text-gray-600'}`} />
      </div>
    );
  }
  if (ch === 'WHATSAPP') {
    return (
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          status === 'FAILED'
            ? 'border-red-500 bg-red-100'
            : status === 'SENT' || status === 'DELIVERED'
              ? 'border-green-500 bg-green-100'
              : 'border-gray-400 bg-gray-100'
        }`}
      >
        <MessageSquare className={`h-5 w-5 ${status === 'FAILED' ? 'text-red-600' : status === 'SENT' || status === 'DELIVERED' ? 'text-green-600' : 'text-gray-600'}`} />
      </div>
    );
  }
  if (ch === 'VOICE') {
    return (
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
          status === 'FAILED'
            ? 'border-red-500 bg-red-100'
            : status === 'SENT' || status === 'DELIVERED'
              ? 'border-purple-500 bg-purple-100'
              : 'border-gray-400 bg-gray-100'
        }`}
      >
        <Phone className={`h-5 w-5 ${status === 'FAILED' ? 'text-red-600' : status === 'SENT' || status === 'DELIVERED' ? 'text-purple-600' : 'text-gray-600'}`} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-400 bg-gray-100">
      <FileText className="h-5 w-5 text-gray-600" />
    </div>
  );
}

interface SummaryData {
  invoiceId: string;
  summary: {
    summary: string;
    keyPoints?: string[];
    nextSteps?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  generatedAt?: string;
}

interface InvoiceHistorialViewProps {
  data: InvoiceHistorialData;
}

export function InvoiceHistorialView({ data }: InvoiceHistorialViewProps) {
  const { invoice } = data;
  const queryClient = useQueryClient();

  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery<SummaryData>({
    queryKey: ['invoice-summary', invoice.id],
    queryFn: async () => {
      const res = await api.get(`/v1/invoices/${invoice.id}/summary`);
      return res.data;
    },
    enabled: !!invoice.id,
  });

  const updateSummaryMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/v1/invoices/${invoice.id}/summary/update`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-summary', invoice.id] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Resumen de la historia (IA) */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Sparkles className="h-4 w-4" />
            Resumen de la historia
          </CardTitle>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={() => updateSummaryMutation.mutate()}
            disabled={updateSummaryMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${updateSummaryMutation.isPending ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          {summaryLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Sparkles className="h-8 w-8 animate-pulse text-indigo-400" />
              <p className="mt-2 text-sm text-gray-500">Generando resumen...</p>
            </div>
          ) : summaryError ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-3 px-4 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No se pudo cargar el resumen. {(summaryError as any)?.response?.data?.message || (summaryError as Error).message}
            </div>
          ) : summaryData?.summary?.summary ? (
            <div className="space-y-4">
              <div className="rounded-lg border-l-4 border-indigo-500 bg-indigo-50/80 py-3 px-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {summaryData.summary.summary}
                </p>
              </div>
              {summaryData.summary.keyPoints && summaryData.summary.keyPoints.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Puntos clave
                  </p>
                  <ul className="space-y-1.5">
                    {summaryData.summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summaryData.summary.nextSteps && summaryData.summary.nextSteps.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Próximos pasos
                  </p>
                  <ul className="space-y-1.5">
                    {summaryData.summary.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-indigo-600">→</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {summaryData.summary.sentiment && (
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
                    {summaryData.summary.sentiment === 'positive'
                      ? 'Positivo'
                      : summaryData.summary.sentiment === 'negative'
                        ? 'Negativo'
                        : 'Neutral'}
                  </Badge>
                )}
                {summaryData.generatedAt && (
                  <span className="text-xs text-gray-400">
                    Generado: {format(new Date(summaryData.generatedAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">
              Sin resumen. Clic en &quot;Actualizar&quot; para generarlo con IA.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resumen compacto */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Factura {invoice.numero}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-gray-500">Cliente</p>
              <p className="font-medium">{invoice.customer.razonSocial}</p>
              {invoice.customer.cuits?.[0] && (
                <p className="text-xs text-gray-500">CUIT: {invoice.customer.cuits.find((c) => c.isPrimary)?.cuit ?? invoice.customer.cuits[0].cuit}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Monto</p>
              <p className="font-semibold">${(invoice.monto / 100).toLocaleString('es-AR')}</p>
              <p className="text-xs text-green-600">Aplicado: ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Vencimiento</p>
              <p className="font-medium">{format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Estado</p>
              {getStatusBadge(invoice.estado)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Clock className="h-4 w-4" />
          Historial de eventos
        </h3>
        {invoice.timeline.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No hay eventos para esta factura</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {invoice.timeline.map((item, index) => (
                <div key={index} className="relative flex items-start gap-4 pl-2">
                  <div className="relative z-10 shrink-0">
                    {getTimelineIcon(item.type, item.channel, item.status)}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {item.type === 'CONTACT' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {item.channel} – {item.direction}
                            </span>
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
                                {item.status === 'SENT' ? 'Enviado' : item.status === 'DELIVERED' ? 'Entregado' : item.status === 'FAILED' ? 'Fallido' : item.status}
                              </Badge>
                            )}
                          </div>
                        )}
                        {item.type === 'PROMISE' && (
                          <span className="text-sm font-semibold text-gray-900">
                            Promesa de pago
                            {item.dueDate && (
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                (vence: {format(new Date(item.dueDate), 'dd/MM/yyyy')})
                              </span>
                            )}
                          </span>
                        )}
                        {item.type === 'PAYMENT' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Pago aplicado</span>
                            {item.isAuthoritative && (
                              <Badge variant="default" className="text-xs">
                                {item.sourceSystem}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-500">
                        {format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    {item.message && (
                      <div className="mt-2 border-l-4 border-blue-500 bg-gray-50 p-2">
                        <p className="text-sm leading-relaxed text-gray-700 line-clamp-3">{item.message}</p>
                      </div>
                    )}
                    {item.amount != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          ${(item.amount / 100).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                    {(item.appliedAt || item.settledAt) && (
                      <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                        {item.appliedAt && (
                          <p><span className="font-medium">Aplicado:</span> {format(new Date(item.appliedAt), 'dd/MM/yyyy HH:mm')}</p>
                        )}
                        {item.settledAt && (
                          <p><span className="font-medium">Liquidado:</span> {format(new Date(item.settledAt), 'dd/MM/yyyy HH:mm')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
