'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface JobResult {
  success: boolean;
  processed: number;
  errors: number;
  details: string[];
}

interface JobResponse {
  job: string;
  result: JobResult;
  executedAt: string;
}

export default function JobsPage() {
  const [lastResults, setLastResults] = useState<Record<string, JobResponse | null>>({});

  const staleConversationsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/v1/jobs/stale-conversations', {
        daysWithoutResponse: 3,
      });
      return response.data as JobResponse;
    },
    onSuccess: (data) => {
      setLastResults((prev) => ({ ...prev, staleConversations: data }));
    },
  });

  const recalculateInvoiceSummariesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/v1/jobs/recalculate-invoice-summaries', {
        limit: 50,
      });
      return response.data as JobResponse;
    },
    onSuccess: (data) => {
      setLastResults((prev) => ({ ...prev, invoiceSummaries: data }));
    },
  });

  const recalculateCustomerSummariesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/v1/jobs/recalculate-customer-summaries', {
        limit: 50,
      });
      return response.data as JobResponse;
    },
    onSuccess: (data) => {
      setLastResults((prev) => ({ ...prev, customerSummaries: data }));
    },
  });

  const runAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/v1/jobs/run-all');
      return response.data as {
        job: string;
        results: {
          staleConversations: JobResult;
          invoiceSummaries: JobResult;
          customerSummaries: JobResult;
        };
        executedAt: string;
      };
    },
    onSuccess: (data) => {
      setLastResults({
        staleConversations: {
          job: 'stale-conversations',
          result: data.results.staleConversations,
          executedAt: data.executedAt,
        },
        invoiceSummaries: {
          job: 'recalculate-invoice-summaries',
          result: data.results.invoiceSummaries,
          executedAt: data.executedAt,
        },
        customerSummaries: {
          job: 'recalculate-customer-summaries',
          result: data.results.customerSummaries,
          executedAt: data.executedAt,
        },
      });
    },
  });

  const jobs = [
    {
      id: 'staleConversations',
      title: 'Detectar Conversaciones Estancadas',
      description: 'Identifica conversaciones sin respuesta en los últimos días',
      icon: AlertCircle,
      color: 'orange',
      mutation: staleConversationsMutation,
    },
    {
      id: 'invoiceSummaries',
      title: 'Recalcular Resúmenes de Facturas',
      description: 'Actualiza los resúmenes inteligentes de facturas con nuevas interacciones',
      icon: RefreshCw,
      color: 'blue',
      mutation: recalculateInvoiceSummariesMutation,
    },
    {
      id: 'customerSummaries',
      title: 'Recalcular Resúmenes de Clientes',
      description: 'Actualiza los resúmenes inteligentes de clientes con nuevas interacciones',
      icon: TrendingUp,
      color: 'purple',
      mutation: recalculateCustomerSummariesMutation,
    },
  ];

  const renderJobResult = (jobId: string, result: JobResponse | null) => {
    if (!result) return null;

    return (
      <Alert className={`mt-4 ${result.result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start gap-3">
          {result.result.success ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={result.result.success ? 'default' : 'destructive'}>
                  {result.result.success ? 'Éxito' : 'Error'}
                </Badge>
                <span className="text-sm text-gray-600">
                  Procesados: {result.result.processed} | Errores: {result.result.errors}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {format(new Date(result.executedAt), 'dd/MM/yyyy HH:mm:ss')}
              </span>
            </div>
            {result.result.details.length > 0 && (
              <div className="mt-2 space-y-1">
                {result.result.details.slice(0, 5).map((detail, index) => (
                  <p key={index} className="text-xs text-gray-700">
                    • {detail}
                  </p>
                ))}
                {result.result.details.length > 5 && (
                  <p className="text-xs text-gray-500">
                    ... y {result.result.details.length - 5} más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Jobs</h1>
          <p className="text-gray-600 mt-2">
            Ejecuta jobs de mantenimiento manualmente o programa su ejecución automática
          </p>
        </div>

        {/* Botón para ejecutar todos */}
        <Card className="mb-6 border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ejecutar Todos los Jobs</h3>
                <p className="text-sm text-white/80">
                  Ejecuta todos los jobs de mantenimiento en secuencia
                </p>
              </div>
              <Button
                onClick={() => runAllMutation.mutate()}
                disabled={runAllMutation.isPending}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                {runAllMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Ejecutar Todos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de jobs */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const Icon = job.icon;
            const isPending = job.mutation.isPending;
            const result = lastResults[job.id];

            return (
              <Card key={job.id} className="border-0 shadow-lg bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        job.color === 'orange' ? 'bg-orange-100' :
                        job.color === 'blue' ? 'bg-blue-100' :
                        'bg-purple-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          job.color === 'orange' ? 'text-orange-600' :
                          job.color === 'blue' ? 'text-blue-600' :
                          'text-purple-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => job.mutation.mutate()}
                    disabled={isPending}
                    className="w-full"
                    variant="outline"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ejecutando...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Ejecutar
                      </>
                    )}
                  </Button>

                  {renderJobResult(job.id, result)}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Información sobre cron jobs */}
        <Card className="mt-6 border-0 shadow-lg bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Configurar Ejecución Automática</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Para ejecutar estos jobs automáticamente, configura cron jobs en Railway:
                </p>
                <div className="bg-white p-3 rounded border border-blue-200 font-mono text-xs">
                  <p className="text-gray-700 mb-1">
                    <strong>Diario a las 2 AM:</strong>
                  </p>
                  <p className="text-gray-600">
                    POST https://tu-api-gateway.railway.app/v1/jobs/run-all
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
