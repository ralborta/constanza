'use client';

import { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Batch {
  id: string;
  channel: string;
  status: string;
  totalMessages: number;
  processed: number;
  failed: number;
  fileName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorSummary: any | null;
  createdBy: {
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

function NotifyBatchesContent() {
  const queryClient = useQueryClient();
  const [retryingBatchId, setRetryingBatchId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);

  const { data: batchesData, isLoading } = useQuery<{ batches: Batch[]; total: number }>({
    queryKey: ['notify-batches'],
    queryFn: async () => {
      const response = await api.get('/v1/notify/batches');
      return response.data;
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  const retryMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await api.post(`/v1/notify/batch/${batchId}/retry`);
      return response.data;
    },
    onSuccess: (data, batchId) => {
      setRetryingBatchId(null);
      setRetryError(null);
      setRetrySuccess(`Se reenviaron ${data.retried} de ${data.totalFailed} mensajes fallidos`);
      // Refrescar la lista de batches
      queryClient.invalidateQueries({ queryKey: ['notify-batches'] });
      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setRetrySuccess(null), 5000);
    },
    onError: (error: any) => {
      setRetryingBatchId(null);
      setRetryError(error.response?.data?.error || 'Error al reenviar mensajes');
      setTimeout(() => setRetryError(null), 5000);
    },
  });

  const handleRetry = (batchId: string) => {
    setRetryingBatchId(batchId);
    setRetryError(null);
    setRetrySuccess(null);
    retryMutation.mutate(batchId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Procesando
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completado
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Fallido
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'WHATSAPP':
        return <MessageSquare className="h-4 w-4" />;
      case 'VOICE':
        return <Phone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getProgress = (batch: Batch) => {
    if (batch.totalMessages === 0) return 0;
    return Math.round((batch.processed / batch.totalMessages) * 100);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2">Cargando batches...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {retryError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{retryError}</AlertDescription>
          </Alert>
        )}
        {retrySuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{retrySuccess}</AlertDescription>
          </Alert>
        )}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Progreso de Mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            {!batchesData || batchesData.batches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay batches de mensajes</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Fallidos</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchesData.batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(batch.channel)}
                          <span className="font-medium">{batch.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${
                            getProgress(batch) === 100
                              ? 'text-green-600 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {getProgress(batch)}%
                        </span>
                      </TableCell>
                      <TableCell>{batch.totalMessages}</TableCell>
                      <TableCell className="text-green-600">{batch.processed}</TableCell>
                      <TableCell className="text-red-600">
                        {batch.failed > 0 ? (
                          <div className="flex items-center gap-2">
                            <span>{batch.failed}</span>
                            {batch.errorSummary && (
                              <span className="text-xs text-red-500" title={JSON.stringify(batch.errorSummary, null, 2)}>
                                ⚠️
                              </span>
                            )}
                          </div>
                        ) : (
                          batch.failed
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(batch.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {batch.createdBy
                          ? `${batch.createdBy.nombre} ${batch.createdBy.apellido}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[280px]">
                        {batch.failed > 0 && batch.errorSummary ? (
                          <div className="truncate" title={typeof batch.errorSummary === 'string' ? batch.errorSummary : JSON.stringify(batch.errorSummary, null, 2)}>
                            {Array.isArray(batch.errorSummary) 
                              ? batch.errorSummary.map((err: any, idx: number) => (
                                  <div key={idx} className="truncate">
                                    {err.message || err.code || 'Error desconocido'}
                                  </div>
                                )).slice(0, 1) // Mostrar solo el primer error
                              : typeof batch.errorSummary === 'string'
                              ? batch.errorSummary
                              : batch.errorSummary.message || batch.errorSummary.error || 'Error desconocido'}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.failed > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(batch.id)}
                            disabled={retryingBatchId === batch.id}
                            className="flex items-center gap-2"
                          >
                            {retryingBatchId === batch.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Reenviando...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3" />
                                Reenviar fallidos
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function NotifyBatchesPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NotifyBatchesContent />
    </Suspense>
  );
}

