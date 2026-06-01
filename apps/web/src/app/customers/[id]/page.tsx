'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { asArray } from '@/lib/utils';
import { MainLayout } from '@/components/layout/main-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type TimelineItem = {
  type: 'CONTACT' | 'PROMISE' | 'PAYMENT' | 'ECHEQ' | 'CALLBACK';
  id: string;
  ts: string;
  invoiceId?: string | null;
  invoiceNumero?: string | null;
  channel?: string;
  direction?: string;
  status?: string;
  title: string;
  message?: string | null;
  amount?: number | null;
  dueDate?: string | null;
  settledAt?: string | null;
};

type CustomerHistoryResponse = {
  customer: {
    id: string;
    codigoUnico: string;
    codigoVenta: string;
    externalRef?: string | null;
    razonSocial: string;
    email: string;
    telefono?: string | null;
    activo: boolean;
    cuits: Array<{ id: string; cuit: string; isPrimary: boolean; razonSocial?: string | null }>;
  };
  metrics: {
    totalFacturado: number;
    totalAplicado: number;
    saldoPendiente: number;
    facturasTotal: number;
    facturasAbiertas: number;
    facturasVencidas: number;
    contactosTotal: number;
    promesasTotal: number;
    promesasCumplidas: number;
    promesasRotas: number;
    callbacksPendientes: number;
    echeqsTotal: number;
    ultimoContactoAt?: string | null;
    ultimoPagoAt?: string | null;
    criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  };
  invoices: Array<{
    id: string;
    numero: string;
    monto: number;
    montoAplicado: number;
    saldo: number;
    fechaVto: string;
    estado: string;
  }>;
  timeline: TimelineItem[];
};

function money(cents: number | null | undefined) {
  return `$${((cents || 0) / 100).toLocaleString('es-AR')}`;
}

function safeDate(value: string | null | undefined, withTime = false) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return format(parsed, withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
}

function statusBadge(status?: string | null) {
  const value = status || '-';
  const map: Record<string, string> = {
    ALTA: 'bg-red-50 text-red-700 border-red-200',
    MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
    BAJA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    VENCIDA: 'bg-red-50 text-red-700 border-red-200',
    ABIERTA: 'bg-amber-50 text-amber-700 border-amber-200',
    PARCIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    SALDADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    PENDING: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return <Badge className={`border ${map[value] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>{value}</Badge>;
}

function timelineIcon(item: TimelineItem) {
  const common = 'h-9 w-9 rounded-full flex items-center justify-center border';
  if (item.type === 'PAYMENT') return <div className={`${common} bg-emerald-50 border-emerald-200`}><CreditCard className="h-4 w-4 text-emerald-700" /></div>;
  if (item.type === 'PROMISE') return <div className={`${common} bg-amber-50 border-amber-200`}><Clock className="h-4 w-4 text-amber-700" /></div>;
  if (item.type === 'ECHEQ') return <div className={`${common} bg-green-50 border-green-200`}><Receipt className="h-4 w-4 text-green-700" /></div>;
  if (item.type === 'CALLBACK') return <div className={`${common} bg-purple-50 border-purple-200`}><CalendarClock className="h-4 w-4 text-purple-700" /></div>;
  const channel = (item.channel || '').toUpperCase();
  if (channel === 'VOICE') return <div className={`${common} bg-indigo-50 border-indigo-200`}><Phone className="h-4 w-4 text-indigo-700" /></div>;
  if (channel === 'WHATSAPP') return <div className={`${common} bg-emerald-50 border-emerald-200`}><MessageSquare className="h-4 w-4 text-emerald-700" /></div>;
  if (channel === 'EMAIL') return <div className={`${common} bg-blue-50 border-blue-200`}><Mail className="h-4 w-4 text-blue-700" /></div>;
  return <div className={`${common} bg-slate-50 border-slate-200`}><FileText className="h-4 w-4 text-slate-700" /></div>;
}

export default function CustomerClinicalHistoryPage() {
  const params = useParams();
  const customerId = typeof params.id === 'string' ? params.id : '';

  const { data, isLoading, isError, error } = useQuery<CustomerHistoryResponse>({
    queryKey: ['customer-historial', customerId],
    queryFn: async () => {
      const response = await api.get(`/v1/customers/${customerId}/historial`);
      return response.data;
    },
    enabled: !!customerId,
  });

  const customerInvoices = asArray<CustomerHistoryResponse['invoices'][number]>(data?.invoices);
  const customerTimeline = asArray<TimelineItem>(data?.timeline);
  const customerCuits = asArray<CustomerHistoryResponse['customer']['cuits'][number]>(data?.customer?.cuits);

  const primaryCuit = useMemo(
    () => customerCuits.find((cuit) => cuit.isPrimary)?.cuit || customerCuits[0]?.cuit || '-',
    [customerCuits]
  );

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/customers" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a clientes
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Historia clínica del cliente</h1>
            <p className="text-sm text-gray-500">Vista 360° de facturas, gestiones, promesas y pagos.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-500">Cargando historia clínica...</p>
        ) : isError ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              {(error as any)?.response?.data?.error || (error as Error).message || 'No se pudo cargar el cliente.'}
            </AlertDescription>
          </Alert>
        ) : data ? (
          <div className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{data.customer.razonSocial}</CardTitle>
                    <p className="mt-1 text-sm text-white/80">
                      CVU {data.customer.codigoUnico} · CUIT {primaryCuit}
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      {data.customer.email} · {data.customer.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs uppercase tracking-wide text-white/70">Criticidad</p>
                    {statusBadge(data.metrics.criticidad)}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo pendiente</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{money(data.metrics.saldoPendiente)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Facturas abiertas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{data.metrics.facturasAbiertas}</p><p className="text-xs text-red-600">{data.metrics.facturasVencidas} vencidas</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gestiones</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{data.metrics.contactosTotal}</p><p className="text-xs text-gray-500">Última: {safeDate(data.metrics.ultimoContactoAt, true)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Promesas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{data.metrics.promesasTotal}</p><p className="text-xs text-gray-500">{data.metrics.promesasCumplidas} cumplidas · {data.metrics.promesasRotas} rotas</p></CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-indigo-50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  Resumen operativo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Facturado / aplicado</p>
                  <p className="mt-1 font-semibold">{money(data.metrics.totalFacturado)} / {money(data.metrics.totalAplicado)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Último pago</p>
                  <p className="mt-1 font-semibold">{safeDate(data.metrics.ultimoPagoAt, true)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Pendientes</p>
                  <p className="mt-1 font-semibold">{data.metrics.callbacksPendientes} callbacks · {data.metrics.echeqsTotal} e-cheques</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b"><CardTitle className="text-base">Facturas del cliente</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Aplicado</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link className="font-semibold text-blue-600 hover:underline" href={`/invoices/${invoice.id}`}>
                            {invoice.numero}
                          </Link>
                        </TableCell>
                        <TableCell>{money(invoice.monto)}</TableCell>
                        <TableCell>{money(invoice.montoAplicado)}</TableCell>
                        <TableCell className="font-semibold">{money(invoice.saldo)}</TableCell>
                        <TableCell>{safeDate(invoice.fechaVto)}</TableCell>
                        <TableCell>{statusBadge(invoice.estado)}</TableCell>
                      </TableRow>
                    ))}
                    {customerInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500">Sin facturas cargadas.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b"><CardTitle className="text-base">Timeline clínico</CardTitle></CardHeader>
              <CardContent className="p-4">
                {customerTimeline.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">Sin eventos todavía.</p>
                ) : (
                  <div className="relative space-y-4">
                    <div className="absolute bottom-0 left-4 top-0 w-px bg-gray-200" />
                    {customerTimeline.map((item) => (
                      <div key={`${item.type}-${item.id}-${item.ts}`} className="relative flex gap-4">
                        <div className="relative z-10">{timelineIcon(item)}</div>
                        <div className="min-w-0 flex-1 rounded-lg border bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900">{item.title}</p>
                              {item.invoiceNumero && (
                                <Link href={`/invoices/${item.invoiceId}`} className="text-xs text-blue-600 hover:underline">
                                  Factura {item.invoiceNumero}
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.status && statusBadge(item.status)}
                              <span className="text-xs text-gray-500">{safeDate(item.ts, true)}</span>
                            </div>
                          </div>
                          {item.message && <p className="mt-2 line-clamp-3 text-sm text-gray-700">{item.message}</p>}
                          {item.amount != null && <p className="mt-2 text-sm font-semibold">{money(item.amount)}</p>}
                          {item.dueDate && <p className="mt-1 text-xs text-gray-500">Vence: {safeDate(item.dueDate)}</p>}
                          {item.settledAt && <p className="mt-1 text-xs text-gray-500">Liquidado: {safeDate(item.settledAt, true)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
