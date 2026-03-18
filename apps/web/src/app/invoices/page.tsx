'use client';

import { useState } from 'react';
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
import { Search, Eye, History, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UploadInvoiceButton } from '@/components/invoices/upload-invoice-button';
import { InvoiceHistorialDrawer } from '@/components/invoices/invoice-historial-drawer';

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

function getStatusBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    ABIERTA:    { label: 'Por vencer', className: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50' },
    VENCIDA:    { label: 'Vencido',    className: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-50' },
    PARCIAL:    { label: 'Parcial',    className: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50' },
    PAGADA:     { label: 'Pagada',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
    PROGRAMADA: { label: 'Programado', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50' },
  };
  const s = map[estado] || { label: estado, className: '' };
  return <Badge className={`font-medium text-xs ${s.className}`}>{s.label}</Badge>;
}

export default function InvoicesPage() {
  const [historialInvoiceId, setHistorialInvoiceId] = useState<string | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);

  const { data, isLoading } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await api.get('/v1/invoices');
      return response.data;
    },
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestión y seguimiento de todas las facturas</p>
          </div>
          <UploadInvoiceButton />
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-base font-semibold text-foreground">Todas las Facturas</CardTitle>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  ) : data?.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No hay facturas</TableCell>
                    </TableRow>
                  ) : (
                    data?.invoices.map((invoice) => (
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
                            <div className="text-sm font-medium text-foreground">{invoice.customer.razonSocial}</div>
                            {invoice.customer.cuit && (
                              <div className="text-xs text-muted-foreground">CUIT: {invoice.customer.cuit}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-foreground">
                          ${(invoice.monto / 100).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium text-emerald-600">
                          ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(invoice.estado)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${invoice.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver Detalle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setHistorialInvoiceId(invoice.id);
                                  setHistorialOpen(true);
                                }}
                              >
                                <History className="mr-2 h-4 w-4" />
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

        <InvoiceHistorialDrawer
          invoiceId={historialInvoiceId}
          open={historialOpen}
          onOpenChange={(open) => {
            setHistorialOpen(open);
            if (!open) setHistorialInvoiceId(null);
          }}
        />
      </div>
    </MainLayout>
  );
}
