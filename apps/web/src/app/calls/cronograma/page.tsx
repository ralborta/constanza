'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarClock, Loader2, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduledCallback {
  id: string;
  customerId: string;
  customer: {
    id: string;
    razonSocial: string;
    codigoUnico: string;
    telefono: string | null;
  } | null;
  invoiceId: string | null;
  invoice: {
    id: string;
    numero: string;
    monto: number;
  } | null;
  sourceContactEventId: string | null;
  scheduledAt: string;
  type: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export default function CronogramaPage() {
  const { data, isLoading } = useQuery<{
    callbacks: ScheduledCallback[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['calls-cronograma'],
    queryFn: async () => {
      const response = await api.get('/v1/calls/cronograma', {
        params: { status: 'PENDING', limit: 100 },
      });
      return response.data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pendiente
          </Badge>
        );
      case 'DONE':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Realizado
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'FOLLOW_UP') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Seguimiento
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
        Callback
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Cronograma de Callbacks
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Llamadas de seguimiento programadas a partir del resumen generado por IA
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-cyan-600" />
                Callbacks programados
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando cronograma...</p>
              </div>
            ) : !data?.callbacks?.length ? (
              <div className="text-center py-12">
                <CalendarClock className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-gray-500">No hay callbacks programados</p>
                <p className="mt-1 text-sm text-gray-400">
                  Se generan automáticamente cuando una llamada finaliza y el resumen de IA indica
                  seguimiento o promesa (ej. &quot;volver a llamar en 3 días&quot;).
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha programada</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.callbacks.map((cb) => (
                    <TableRow key={cb.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(cb.scheduledAt), "EEEE d MMM yyyy, HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{cb.customer?.razonSocial || 'N/A'}</p>
                            {cb.customer?.telefono && (
                              <p className="text-xs text-gray-500 font-mono">{cb.customer.telefono}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cb.invoice ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{cb.invoice.numero}</p>
                              <p className="text-xs text-gray-500">
                                ${(cb.invoice.monto / 100).toLocaleString('es-AR')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(cb.type)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-700">{cb.reason || '-'}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(cb.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {data && data.total > 0 && (
              <div className="mt-4 text-sm text-gray-500">
                Mostrando {data.callbacks.length} de {data.total} callbacks
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
