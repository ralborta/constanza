'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChatCircleText, Clock, Envelope, FileText, PaperPlaneTilt, User } from '@phosphor-icons/react';
import api from '@/lib/api';
import { asArray } from '@/lib/utils';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MessageCallback {
  id: string;
  customer: {
    id: string;
    razonSocial: string;
    codigoUnico: string;
    telefono: string | null;
    email: string | null;
  } | null;
  invoice: {
    id: string;
    numero: string;
    monto: number;
  } | null;
  sourceContactEvent: {
    id: string;
    channel: 'WHATSAPP' | 'EMAIL' | string;
    messageText: string | null;
    status: string;
    ts: string;
    externalMessageId: string | null;
  } | null;
  scheduledAt: string;
  type: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

function safeDate(value: string | null | undefined, pattern: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return format(parsed, pattern, { locale: es });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    DONE: 'Realizado',
    CANCELLED: 'Cancelado',
  };
  return (
    <Badge variant="outline" className={map[status] ?? 'bg-muted text-muted-foreground border-border'}>
      {labels[status] ?? status}
    </Badge>
  );
}

function typeBadge(type: string) {
  const isFollowUp = type === 'FOLLOW_UP';
  return (
    <Badge
      variant="outline"
      className={isFollowUp ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}
    >
      {isFollowUp ? 'Seguimiento' : 'Callback'}
    </Badge>
  );
}

function channelBadge(channel?: string | null) {
  if (channel === 'EMAIL') {
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
        <Envelope size={13} weight="duotone" className="mr-1" />
        Email
      </Badge>
    );
  }
  if (channel === 'VOICE') {
    return (
      <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
        <ChatCircleText size={13} weight="duotone" className="mr-1" />
        Llamada
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
      <ChatCircleText size={13} weight="duotone" className="mr-1" />
      WhatsApp
    </Badge>
  );
}

export default function MessageCallbacksPage() {
  const [status, setStatus] = useState('ALL');
  const [channel, setChannel] = useState('WHATSAPP,EMAIL,VOICE');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const { data, isLoading, isFetching, isError, dataUpdatedAt } = useQuery<{
    callbacks: MessageCallback[];
    total: number;
  }>({
    queryKey: ['notify-callbacks', status, channel, refreshNonce],
    queryFn: async () => {
      const response = await api.get('/v1/notify/callbacks', {
        params: { status, channel, limit: 100, _ts: refreshNonce || Date.now() },
      });
      return response.data;
    },
  });

  const callbackList = asArray<MessageCallback>(data?.callbacks);

  const totals = useMemo(() => {
    return {
      total: data?.total ?? callbackList.length,
      whatsapp: callbackList.filter((callback) => callback.sourceContactEvent?.channel === 'WHATSAPP').length,
      email: callbackList.filter((callback) => callback.sourceContactEvent?.channel === 'EMAIL').length,
      voice: callbackList.filter((callback) => callback.sourceContactEvent?.channel === 'VOICE').length,
    };
  }, [data?.total, callbackList]);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Callbacks de Mensajes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Seguimientos y promesas detectadas desde respuestas por WhatsApp o email.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Última actualización: {dataUpdatedAt ? safeDate(new Date(dataUpdatedAt).toISOString(), "d MMM, HH:mm:ss") : '-'}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => setRefreshNonce(Date.now())}
          >
            {isFetching ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Clock size={24} weight="duotone" className="text-amber-600" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Total filtrado</p>
                <p className="text-2xl font-semibold">{totals.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <ChatCircleText size={24} weight="duotone" className="text-emerald-600" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">WhatsApp</p>
                <p className="text-2xl font-semibold">{totals.whatsapp}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Envelope size={24} weight="duotone" className="text-sky-600" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Email</p>
                <p className="text-2xl font-semibold">{totals.email}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <ChatCircleText size={24} weight="duotone" className="text-violet-600" />
              <div>
                <p className="text-xs uppercase text-muted-foreground">Llamadas</p>
                <p className="text-2xl font-semibold">{totals.voice}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PaperPlaneTilt size={18} weight="duotone" />
                Seguimientos detectados
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP,EMAIL,VOICE">Todos</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="VOICE">Llamadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                    <SelectItem value="DONE">Realizados</SelectItem>
                    <SelectItem value="CANCELLED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Cargando callbacks...</div>
            ) : isError ? (
              <div className="py-12 text-center text-sm text-destructive">No se pudieron cargar los callbacks.</div>
            ) : callbackList.length === 0 ? (
              <div className="py-12 text-center">
                <Clock size={40} weight="duotone" className="mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No hay callbacks de mensajes con este filtro</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Se crean cuando un cliente responde algo como &quot;llamame mañana&quot; o &quot;pago el viernes&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Programado</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensaje origen</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callbackList.map((callback) => (
                      <TableRow key={callback.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {safeDate(callback.scheduledAt, "d MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell>{channelBadge(callback.sourceContactEvent?.channel)}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <User size={16} weight="duotone" className="mt-0.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{callback.customer?.razonSocial ?? 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">
                                {callback.customer?.telefono || callback.customer?.email || callback.customer?.codigoUnico || '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {callback.invoice ? (
                            <div className="flex items-start gap-2">
                              <FileText size={16} weight="duotone" className="mt-0.5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{callback.invoice.numero}</p>
                                <p className="text-xs text-muted-foreground">
                                  ${(callback.invoice.monto / 100).toLocaleString('es-AR')}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{typeBadge(callback.type)}</TableCell>
                        <TableCell className="max-w-md">
                          <p className="line-clamp-2 text-sm text-foreground">
                            {callback.reason || callback.sourceContactEvent?.messageText || '-'}
                          </p>
                          {callback.sourceContactEvent?.ts && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Recibido: {safeDate(callback.sourceContactEvent.ts, "d MMM, HH:mm")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(callback.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
