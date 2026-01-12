'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Download,
  Plus,
  Search,
  Eye,
  Bell,
  Phone,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from 'lucide-react';

interface KPISummary {
  dso: number;
  cashIn7d: number;
  cashIn30d: number;
  promisesToday: number;
  promisesBroken: number;
  autoAppliedPct: number;
  echeqsPending: number;
  totalCollected?: number;
  totalPending?: number;
  efficiency?: number;
  totalCollectedVariation?: number;
  totalPendingVariation?: number;
  efficiencyVariation?: number;
  echeqsVariation?: number;
}

interface Invoice {
  id: string;
  customer: {
    id: string;
    razonSocial: string;
    cuit?: string;
  };
  numero: string;
  monto: number;
  montoAplicado: number;
  fechaVto: string;
  estado: string;
}

interface ECheck {
  id: string;
  emisor: string;
  monto: number;
  estado: string;
}

function getDaysSinceDue(date: string): number {
  const dueDate = new Date(date);
  const today = new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusBadge(estado: string) {
  if (estado === 'ABIERTA' || estado === 'POR_VENCER') {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Por vencer</Badge>;
  }
  if (estado === 'VENCIDA' || estado === 'VENCIDO') {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vencido</Badge>;
  }
  if (estado === 'PROGRAMADA' || estado === 'PROGRAMADO') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Programado</Badge>;
  }
  if (estado === 'PARCIAL') {
    return <Badge variant="outline">Parcial</Badge>;
  }
  return <Badge variant="outline">{estado}</Badge>;
}

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery<KPISummary>({
    queryKey: ['kpis'],
    queryFn: async () => {
      const response = await api.get('/v1/kpi/summary');
      return response.data;
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await api.get('/v1/invoices?state=ABIERTA');
      return response.data;
    },
  });

  const { data: interactionMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['interaction-metrics'],
    queryFn: async () => {
      const response = await api.get('/v1/kpi/interaction-metrics');
      return response.data;
    },
  });

  // Mock data para E-Checks (hasta que esté implementado en el backend)
  const eChecks: ECheck[] = [
    { id: 'E-78910', emisor: 'Innova Corp', monto: 250000, estado: 'PENDIENTE' },
    { id: 'E-78911', emisor: 'Global Exports', monto: 55075, estado: 'PENDIENTE' },
    { id: 'E-78912', emisor: 'Quantum Dynamics', monto: 182000, estado: 'PENDIENTE' },
  ];

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Cobranzas</h1>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar Reporte
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Generar Nuevo Cobro
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Monto Total Cobrado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpisLoading ? '...' : `$${((kpis?.totalCollected || kpis?.cashIn30d || 0) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              {kpis?.totalCollectedVariation !== undefined && (
                <p className="text-xs mt-1 font-medium text-white/80">
                  {kpis.totalCollectedVariation >= 0 ? '+' : ''}{kpis.totalCollectedVariation.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-rose-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Deuda Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpisLoading ? '...' : `$${((kpis?.totalPending || 0) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              {kpis?.totalPendingVariation !== undefined && (
                <p className="text-xs mt-1 font-medium text-white/80">
                  {kpis.totalPendingVariation >= 0 ? '+' : ''}{kpis.totalPendingVariation.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Eficiencia de Cobro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpisLoading ? '...' : `${(kpis?.efficiency || kpis?.autoAppliedPct || 0).toFixed(0)}%`}
              </div>
              {kpis?.efficiencyVariation !== undefined && (
                <p className="text-xs mt-1 font-medium text-white/80">
                  {kpis.efficiencyVariation >= 0 ? '+' : ''}{kpis.efficiencyVariation.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">E-Checks Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {kpisLoading ? '...' : kpis?.echeqsPending || 0}
              </div>
              {kpis?.echeqsVariation !== undefined && (
                <p className="text-xs mt-1 font-medium text-white/80">
                  {kpis.echeqsVariation >= 0 ? '+' : ''}{kpis.echeqsVariation.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Métricas Operativas de Interacciones */}
        {interactionMetrics && (
          <Card className="mb-6 border-0 shadow-lg bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Métricas Operativas de Interacciones (Últimos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {metricsLoading ? (
                <p className="text-gray-500">Cargando métricas...</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Tasa de Respuesta por Canal */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Tasa de Respuesta</h3>
                    <div className="space-y-2">
                      {Object.entries(interactionMetrics.responseRate || {}).map(([channel, data]: [string, any]) => (
                        <div key={channel} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">{data.rate}%</span>
                            <p className="text-xs text-gray-500">{data.responded}/{data.sent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Efectividad por Canal */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Efectividad de Entrega</h3>
                    <div className="space-y-2">
                      {Object.entries(interactionMetrics.effectiveness || {}).map(([channel, data]: [string, any]) => (
                        <div key={channel} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">{data.rate}%</span>
                            <p className="text-xs text-gray-500">{data.delivered}/{data.sent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Volumen */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Volumen de Interacciones</h3>
                    <div className="space-y-2">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-lg font-bold text-gray-900">{interactionMetrics.volume?.total || 0}</p>
                      </div>
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-600 mb-1">Enviadas (Outbound)</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {Object.values(interactionMetrics.volume?.outbound || {}).reduce((a: number, b: number) => a + b, 0)}
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <p className="text-xs text-green-600 mb-1">Recibidas (Inbound)</p>
                        <p className="text-sm font-semibold text-green-900">
                          {Object.values(interactionMetrics.volume?.inbound || {}).reduce((a: number, b: number) => a + b, 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Indicadores Clave */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Indicadores Clave</h3>
                    <div className="space-y-2">
                      <div className="p-2 bg-orange-50 rounded">
                        <p className="text-xs text-orange-600 mb-1">Conversaciones Estancadas</p>
                        <p className="text-lg font-bold text-orange-900">{interactionMetrics.staleConversations || 0}</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <p className="text-xs text-purple-600 mb-1">Casos en Seguimiento</p>
                        <p className="text-lg font-bold text-purple-900">{interactionMetrics.casesInFollowUp || 0}</p>
                      </div>
                      <div className="p-2 bg-indigo-50 rounded">
                        <p className="text-xs text-indigo-600 mb-1">Tiempo Promedio Respuesta</p>
                        <p className="text-sm font-semibold text-indigo-900">
                          {interactionMetrics.avgResponseTimeHours ? `${interactionMetrics.avgResponseTimeHours.toFixed(1)}h` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tabla de Cobranzas Pendientes - Ocupa 2 columnas */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-gray-800">Cobranzas Pendientes</CardTitle>
                {/* Barra de búsqueda y filtros */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-10"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="ABIERTA">Por vencer</SelectItem>
                      <SelectItem value="VENCIDA">Vencido</SelectItem>
                      <SelectItem value="PARCIAL">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Todas las fechas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fechas</SelectItem>
                      <SelectItem value="7d">Últimos 7 días</SelectItem>
                      <SelectItem value="30d">Últimos 30 días</SelectItem>
                      <SelectItem value="90d">Últimos 90 días</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Más filtros
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center gap-1">
                            ID FACTURA
                            <ArrowDown className="h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center gap-1">
                            CLIENTE
                            <ArrowUp className="h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead>MONTO</TableHead>
                        <TableHead>FECHA VENCIMIENTO</TableHead>
                        <TableHead>ANTIGÜEDAD</TableHead>
                        <TableHead>ESTADO</TableHead>
                        <TableHead>ACCIONES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500">
                            Cargando...
                          </TableCell>
                        </TableRow>
                      ) : invoices?.invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500">
                            No hay facturas pendientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices?.invoices.map((invoice) => {
                          const daysSinceDue = getDaysSinceDue(invoice.fechaVto);
                          return (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                {invoice.numero}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{invoice.customer.razonSocial}</div>
                                  {invoice.customer.cuit && (
                                    <div className="text-xs text-gray-500">CUIT: {invoice.customer.cuit}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                ${(invoice.monto / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>{format(new Date(invoice.fechaVto), 'dd MMM yyyy')}</TableCell>
                              <TableCell>
                                <span className={daysSinceDue > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                  {daysSinceDue > 0 ? `${daysSinceDue} días` : 'Al día'}
                                </span>
                              </TableCell>
                              <TableCell>{getStatusBadge(invoice.estado)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/invoices/${invoice.id}`}>
                                      Ver
                                    </Link>
                                  </Button>
                                  {invoice.estado === 'ABIERTA' && (
                                    <Button variant="ghost" size="sm">
                                      Recordar
                                    </Button>
                                  )}
                                  {invoice.estado === 'VENCIDA' && (
                                    <Button variant="ghost" size="sm">
                                      Llamar
                                    </Button>
                                  )}
                                  {invoice.estado === 'PROGRAMADA' && (
                                    <Button variant="ghost" size="sm">
                                      Editar
                                    </Button>
                                  )}
                                  {invoice.estado === 'VENCIDA' && (
                                    <Button variant="ghost" size="sm">
                                      Notificar
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Paginación */}
                {invoices && invoices.invoices.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Mostrando 1-{invoices.invoices.length} de {invoices.invoices.length} resultados
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-gray-100">
                        1
                      </Button>
                      <Button variant="outline" size="sm">
                        2
                      </Button>
                      <Button variant="outline" size="sm">
                        3
                      </Button>
                      <Button variant="outline" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: E-Checks arriba y Gráfico abajo */}
          <div className="space-y-6">
            {/* Tabla de E-Checks */}
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-800">E-Checks Pendientes de Aprobación</CardTitle>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Ver todos
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID CHEQUE</TableHead>
                        <TableHead>EMISOR</TableHead>
                        <TableHead className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center gap-1">
                            MONTO
                            <ArrowUp className="h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead>ACCIONES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eChecks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-4">
                            No hay e-cheques pendientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        eChecks.map((check) => (
                          <TableRow key={check.id}>
                            <TableCell className="font-medium">{check.id}</TableCell>
                            <TableCell>{check.emisor}</TableCell>
                            <TableCell>
                              ${(check.monto / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                Aprobar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Rendimiento Mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento de Cobranzas Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {/* Mock bars - en producción usar una librería de gráficos como recharts */}
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((month, index) => {
                    const heights = [45, 52, 48, 60, 55, 70]; // Valores mock
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-400 rounded-t"
                          style={{ height: `${heights[index]}%` }}
                        />
                        <span className="mt-2 text-xs text-gray-500">{month}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
