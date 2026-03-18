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
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileCheck,
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
    return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 font-medium">Por vencer</Badge>;
  }
  if (estado === 'VENCIDA' || estado === 'VENCIDO') {
    return <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-medium">Vencido</Badge>;
  }
  if (estado === 'PROGRAMADA' || estado === 'PROGRAMADO') {
    return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">Programado</Badge>;
  }
  if (estado === 'PARCIAL') {
    return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 font-medium">Parcial</Badge>;
  }
  return <Badge variant="outline" className="font-medium">{estado}</Badge>;
}

interface KpiCardProps {
  title: string;
  value: string;
  variation?: number;
  icon: React.ReactNode;
  accentColor: string;
}

function KpiCard({ title, value, variation, icon, accentColor }: KpiCardProps) {
  const isPositive = variation !== undefined && variation >= 0;
  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
            <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
            {variation !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{isPositive ? '+' : ''}{variation.toFixed(1)}% vs. mes anterior</span>
              </div>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentColor}`}>
            {icon}
          </div>
        </div>
        <div className={`mt-4 h-0.5 w-full rounded-full ${accentColor}`} />
      </CardContent>
    </Card>
  );
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Cobranzas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Resumen operativo en tiempo real</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cobro
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Monto Total Cobrado"
            value={kpisLoading ? '—' : `$${((kpis?.totalCollected || kpis?.cashIn30d || 0) / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
            variation={kpis?.totalCollectedVariation}
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
            accentColor="bg-emerald-100"
          />
          <KpiCard
            title="Deuda Pendiente"
            value={kpisLoading ? '—' : `$${((kpis?.totalPending || 0) / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
            variation={kpis?.totalPendingVariation}
            icon={<AlertCircle className="h-5 w-5 text-red-600" />}
            accentColor="bg-red-100"
          />
          <KpiCard
            title="Eficiencia de Cobro"
            value={kpisLoading ? '—' : `${(kpis?.efficiency || kpis?.autoAppliedPct || 0).toFixed(0)}%`}
            variation={kpis?.efficiencyVariation}
            icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
            accentColor="bg-blue-100"
          />
          <KpiCard
            title="E-Checks Pendientes"
            value={kpisLoading ? '—' : String(kpis?.echeqsPending || 0)}
            variation={kpis?.echeqsVariation}
            icon={<FileCheck className="h-5 w-5 text-amber-600" />}
            accentColor="bg-amber-100"
          />
        </div>

        {/* Métricas Operativas */}
        {interactionMetrics && (
          <Card className="mb-6 border border-border shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Métricas Operativas de Interacciones</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 días</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {metricsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando métricas...</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Tasa de Respuesta</h3>
                    <div className="space-y-2">
                      {Object.entries(interactionMetrics.responseRate || {}).map(([channel, data]: [string, any]) => (
                        <div key={channel} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                          <span className="text-sm text-foreground">{channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-foreground">{data.rate}%</span>
                            <p className="text-xs text-muted-foreground">{data.responded}/{data.sent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Efectividad de Entrega</h3>
                    <div className="space-y-2">
                      {Object.entries(interactionMetrics.effectiveness || {}).map(([channel, data]: [string, any]) => (
                        <div key={channel} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md">
                          <span className="text-sm text-foreground">{channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-foreground">{data.rate}%</span>
                            <p className="text-xs text-muted-foreground">{data.delivered}/{data.sent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Volumen de Interacciones</h3>
                    <div className="space-y-2">
                      <div className="p-2.5 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="text-lg font-bold text-foreground font-mono">{interactionMetrics.volume?.total || 0}</p>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-md border border-blue-100">
                        <p className="text-xs text-blue-600 mb-1">Enviadas (Outbound)</p>
                        <p className="text-sm font-semibold text-blue-900 font-mono">
                          {(Object.values(interactionMetrics.volume?.outbound || {}) as number[]).reduce((a, b) => a + b, 0)}
                        </p>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-md border border-emerald-100">
                        <p className="text-xs text-emerald-600 mb-1">Recibidas (Inbound)</p>
                        <p className="text-sm font-semibold text-emerald-900 font-mono">
                          {(Object.values(interactionMetrics.volume?.inbound || {}) as number[]).reduce((a, b) => a + b, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Indicadores Clave</h3>
                    <div className="space-y-2">
                      <div className="p-2.5 bg-amber-50 rounded-md border border-amber-100">
                        <p className="text-xs text-amber-600 mb-1">Conversaciones Estancadas</p>
                        <p className="text-lg font-bold text-amber-900 font-mono">{interactionMetrics.staleConversations || 0}</p>
                      </div>
                      <div className="p-2.5 bg-primary/5 rounded-md border border-primary/10">
                        <p className="text-xs text-primary mb-1">Casos en Seguimiento</p>
                        <p className="text-lg font-bold text-primary font-mono">{interactionMetrics.casesInFollowUp || 0}</p>
                      </div>
                      <div className="p-2.5 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Tiempo Promedio Respuesta</p>
                        <p className="text-sm font-semibold text-foreground">
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
          {/* Tabla Cobranzas Pendientes */}
          <div className="lg:col-span-2">
            <Card className="border border-border shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">Cobranzas Pendientes</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Facturas abiertas y por vencer</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-9 h-9 text-sm" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="ABIERTA">Por vencer</SelectItem>
                      <SelectItem value="VENCIDA">Vencido</SelectItem>
                      <SelectItem value="PARCIAL">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fechas</SelectItem>
                      <SelectItem value="7d">Últimos 7 días</SelectItem>
                      <SelectItem value="30d">Últimos 30 días</SelectItem>
                      <SelectItem value="90d">Últimos 90 días</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9 text-sm">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Filtros
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
                          <div className="flex items-center gap-1">Factura <ArrowDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
                          <div className="flex items-center gap-1">Cliente <ArrowUp className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monto</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencimiento</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Antigüedad</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Cargando...</TableCell>
                        </TableRow>
                      ) : invoices?.invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No hay facturas pendientes</TableCell>
                        </TableRow>
                      ) : (
                        invoices?.invoices.map((invoice) => {
                          const daysSinceDue = getDaysSinceDue(invoice.fechaVto);
                          return (
                            <TableRow key={invoice.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-sm font-medium text-foreground">{invoice.numero}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="text-sm font-medium text-foreground">{invoice.customer.razonSocial}</div>
                                  {invoice.customer.cuit && (
                                    <div className="text-xs text-muted-foreground">CUIT: {invoice.customer.cuit}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-semibold text-foreground">
                                ${(invoice.monto / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-sm text-foreground">{format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>
                                <span className={`text-sm font-medium ${daysSinceDue > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {daysSinceDue > 0 ? `${daysSinceDue}d` : 'Al día'}
                                </span>
                              </TableCell>
                              <TableCell>{getStatusBadge(invoice.estado)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10" asChild>
                                    <Link href={`/invoices/${invoice.id}`}>Ver</Link>
                                  </Button>
                                  {(invoice.estado === 'ABIERTA' || invoice.estado === 'VENCIDA') && (
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                                      {invoice.estado === 'ABIERTA' ? 'Recordar' : 'Llamar'}
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
                {invoices && invoices.invoices.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {invoices.invoices.length} resultados
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">3</Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* E-Checks */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">E-Checks Pendientes</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Pendientes de aprobación</p>
                  </div>
                  <Link href="#" className="text-xs text-primary hover:underline font-medium">Ver todos</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emisor</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monto</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eChecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No hay e-cheques pendientes</TableCell>
                      </TableRow>
                    ) : (
                      eChecks.map((check) => (
                        <TableRow key={check.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-medium text-foreground">{check.id}</TableCell>
                          <TableCell className="text-sm text-foreground">{check.emisor}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            ${(check.monto / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                              Aprobar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Gráfico de barras */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Rendimiento Mensual</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Cobranzas de los últimos 6 meses</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-48 flex items-end justify-between gap-2">
                  {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((month, index) => {
                    const heights = [45, 52, 48, 60, 55, 70];
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-primary/80 hover:bg-primary rounded-sm transition-colors cursor-default"
                          style={{ height: `${heights[index]}%` }}
                          title={`${month}: ${heights[index]}%`}
                        />
                        <span className="text-xs text-muted-foreground">{month}</span>
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
