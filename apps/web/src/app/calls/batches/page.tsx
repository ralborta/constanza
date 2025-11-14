'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Batch {
  id: string;
  status: string;
  totalMessages: number;
  processed: number;
  failed: number;
  fileName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: {
    nombre: string;
    apellido: string;
    email: string;
  } | null;
}

function CallsBatchesContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    searchParams.get('batchId')
  );

  const { data: batchesData, isLoading } = useQuery<{ batches: Batch[]; total: number }>({
    queryKey: ['calls-batches'],
    queryFn: async () => {
      const response = await api.get('/v1/calls/batches');
      return response.data;
    },
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

  const executeMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await api.post(`/v1/calls/batch/${batchId}/execute`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls-batches'] });
    },
  });

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

  const getProgress = (batch: Batch) => {
    if (batch.totalMessages === 0) return 0;
    return Math.round((batch.processed / batch.totalMessages) * 100);
  };

  useEffect(() => {
    if (selectedBatchId && batchesData) {
      const batch = batchesData.batches.find((b) => b.id === selectedBatchId);
      if (batch && batch.status === 'PROCESSING') {
        // Auto-refresh cuando está procesando
        queryClient.invalidateQueries({ queryKey: ['calls-batches'] });
      }
    }
  }, [selectedBatchId, batchesData, queryClient]);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
              Batches de Llamadas
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona y ejecuta batches de llamadas telefónicas
            </p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['calls-batches'] })}
            variant="outline"
            size="sm"
            className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b">
            <CardTitle className="text-gray-800">Lista de Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando batches...</p>
              </div>
            ) : !batchesData || batchesData.batches.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay batches de llamadas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Procesadas</TableHead>
                    <TableHead>Fallidas</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchesData.batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm">
                        {batch.fileName || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${getProgress(batch)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{getProgress(batch)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{batch.totalMessages}</TableCell>
                      <TableCell className="text-green-600">{batch.processed}</TableCell>
                      <TableCell className="text-red-600">{batch.failed}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(batch.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {batch.createdBy
                          ? `${batch.createdBy.nombre} ${batch.createdBy.apellido}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {batch.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedBatchId(batch.id);
                              executeMutation.mutate(batch.id);
                            }}
                            disabled={executeMutation.isPending}
                            className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-md"
                          >
                            {executeMutation.isPending && selectedBatchId === batch.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Ejecutar
                          </Button>
                        )}
                        {batch.status === 'PROCESSING' && (
                          <span className="text-sm text-gray-500">En progreso...</span>
                        )}
                        {batch.status === 'COMPLETED' && (
                          <span className="text-sm text-green-600">Completado</span>
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

export default function CallsBatchesPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="p-8">
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Cargando...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <CallsBatchesContent />
    </Suspense>
  );
}

