'use client';

import React, { useState } from 'react';
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
import { MagnifyingGlass, Eye, ClockCounterClockwise, DotsThreeVertical, WarningCircle } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UploadInvoiceButton } from '@/components/invoices/upload-invoice-button';
import { CreateInvoiceManualButton } from '@/components/invoices/create-invoice-manual-button';
import { InvoiceHistorialDrawer } from '@/components/invoices/invoice-historial-drawer';
import { resolveInvoiceEstadoForDisplay } from '@/lib/invoice-estado';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { asArray } from '@/lib/utils';

interface Invoice {
  id: string;
  customer: {
    id: string;
    razonSocial: string;
    cuit?: string;
  } | null;
  numero: string;
  monto: number;
  montoAplicado: number;
  fechaVto: string;
  estado: string;
}

class SectionErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[InvoicesPage] Section render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function normalizeInvoice(raw: any): Invoice | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!id) return null;

  const customerRaw = raw.customer;
  const customer =
    customerRaw && typeof customerRaw === 'object'
      ? {
          id: typeof customerRaw.id === 'string' ? customerRaw.id : '',
          razonSocial:
            typeof customerRaw.razonSocial === 'string' && customerRaw.razonSocial.trim().length > 0
              ? customerRaw.razonSocial
              : 'Cliente sin datos',
          cuit: typeof customerRaw.cuit === 'string' ? customerRaw.cuit : undefined,
        }
      : null;

  return {
    id,
    customer,
    numero: typeof raw.numero === 'string' && raw.numero.trim().length > 0 ? raw.numero : 'SIN-NUMERO',
    monto: typeof raw.monto === 'number' && Number.isFinite(raw.monto) ? raw.monto : 0,
    montoAplicado:
      typeof raw.montoAplicado === 'number' && Number.isFinite(raw.montoAplicado) ? raw.montoAplicado : 0,
    fechaVto: typeof raw.fechaVto === 'string' ? raw.fechaVto : '',
    estado: typeof raw.estado === 'string' && raw.estado.trim().length > 0 ? raw.estado : 'ABIERTA',
  };
}

function safeMoney(cents: number | null | undefined): string {
  const value = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  return `$${(value / 100).toLocaleString('es-AR')}`;
}

function safeDate(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return format(parsed, 'dd/MM/yyyy');
}

function getStatusBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    ABIERTA:    { label: 'Por vencer', className: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50' },
    VENCIDA:    { label: 'Vencido',    className: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-50' },
    PARCIAL:    { label: 'Parcial',    className: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50' },
    PAGADA:     { label: 'Pagada',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
    SALDADA:    { label: 'Pagada',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
    PROGRAMADA: { label: 'Programado', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
  };
  const s = map[estado] || { label: estado, className: '' };
  return <Badge className={`font-medium text-xs ${s.className}`}>{s.label}</Badge>;
}

export default function InvoicesPage() {
  const [historialInvoiceId, setHistorialInvoiceId] = useState<string | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await api.get('/v1/invoices');
      return response.data;
    },
  });

  const invoiceList = asArray<any>(data?.invoices)
    .map((item) => normalizeInvoice(item))
    .filter((item): item is Invoice => item !== null);

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestión y seguimiento de todas las facturas</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SectionErrorBoundary
              fallback={
                <Button variant="outline" disabled>
                  Nueva factura (no disponible)
                </Button>
              }
            >
              <CreateInvoiceManualButton />
            </SectionErrorBoundary>
            <SectionErrorBoundary
              fallback={
                <Button variant="outline" disabled>
                  Cargar desde Excel (no disponible)
                </Button>
              }
            >
              <UploadInvoiceButton />
            </SectionErrorBoundary>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <WarningCircle className="h-4 w-4" />
            <AlertDescription>
              {(error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
                ?.error ||
                (error as Error)?.message ||
                'No se pudieron cargar las facturas. Verificá NEXT_PUBLIC_API_URL y que la API esté en línea.'}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-base font-semibold text-foreground">Todas las Facturas</CardTitle>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, número de factura..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="ABIERTA">Por vencer</SelectItem>
                  <SelectItem value="VENCIDA">Vencido</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="PAGADA">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Factura</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monto</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aplicado</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencimiento</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Cargando...</TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-destructive py-8">
                        Error al cargar facturas (ver mensaje arriba).
                      </TableCell>
                    </TableRow>
                  ) : invoiceList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No hay facturas</TableCell>
                    </TableRow>
                  ) : (
                    invoiceList.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-mono text-sm font-semibold text-primary hover:underline"
                          >
                            {invoice.numero}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium text-foreground">{invoice.customer?.razonSocial ?? 'Cliente sin datos'}</div>
                            {invoice.customer?.cuit && (
                              <div className="text-xs text-muted-foreground">CUIT: {invoice.customer.cuit}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-foreground">
                          {safeMoney(invoice.monto)}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-emerald-600">
                          {safeMoney(invoice.montoAplicado)}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{safeDate(invoice.fechaVto)}</TableCell>
                        <TableCell>
                          {getStatusBadge(
                            resolveInvoiceEstadoForDisplay(invoice.estado, invoice.monto, invoice.montoAplicado)
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <DotsThreeVertical size={16} weight="bold" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${invoice.id}`}>
                                  <Eye size={15} weight="duotone" className="mr-2" />
                                  Ver Detalle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setHistorialInvoiceId(invoice.id);
                                  setHistorialOpen(true);
                                }}
                              >
                                <ClockCounterClockwise size={15} weight="duotone" className="mr-2" />
                                Ver historial
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <SectionErrorBoundary fallback={null}>
          <InvoiceHistorialDrawer
            invoiceId={historialInvoiceId}
            open={historialOpen}
            onOpenChange={(open) => {
              setHistorialOpen(open);
              if (!open) setHistorialInvoiceId(null);
            }}
          />
        </SectionErrorBoundary>
      </div>
    </MainLayout>
  );
}
