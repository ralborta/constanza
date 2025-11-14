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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, Loader2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

interface Call {
  id: string;
  customerId: string;
  customer: {
    razonSocial: string;
    codigoUnico: string;
    telefono: string | null;
  } | null;
  invoice: {
    numero: string;
    monto: number;
  } | null;
  status: string;
  messageText: string | null;
  externalMessageId: string | null;
  errorReason: string | null;
  ts: string;
  batchId: string | null;
}

export default function CallsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: callsData, isLoading } = useQuery<{ calls: Call[]; total: number }>({
    queryKey: ['calls', statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/v1/calls', { params });
      return response.data;
    },
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Enviada
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Fallida
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCalls = callsData?.calls.filter((call) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        call.customer?.razonSocial.toLowerCase().includes(search) ||
        call.customer?.codigoUnico.toLowerCase().includes(search) ||
        call.invoice?.numero.toLowerCase().includes(search) ||
        call.externalMessageId?.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Llamadas Telefónicas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Historial de todas las llamadas realizadas
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Llamadas</CardTitle>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Buscar por cliente, factura o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="SENT">Enviadas</SelectItem>
                    <SelectItem value="FAILED">Fallidas</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando llamadas...</p>
              </div>
            ) : !callsData || filteredCalls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No se encontraron llamadas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Script</TableHead>
                    <TableHead>ID Externa</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{call.customer?.razonSocial || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{call.customer?.codigoUnico}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {call.customer?.telefono || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {call.invoice ? (
                          <div>
                            <p className="font-medium">{call.invoice.numero}</p>
                            <p className="text-xs text-gray-500">
                              ${call.invoice.monto.toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate">{call.messageText || '-'}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {call.externalMessageId || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(call.ts), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {call.errorReason ? (
                          <span className="text-xs text-red-600">{call.errorReason}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {callsData && (
              <div className="mt-4 text-sm text-gray-500">
                Mostrando {filteredCalls.length} de {callsData.total} llamadas
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

