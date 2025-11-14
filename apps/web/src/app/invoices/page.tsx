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
import { Search, Eye, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UploadInvoiceButton } from '@/components/invoices/upload-invoice-button';

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
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ABIERTA: { label: 'Por vencer', variant: 'secondary' },
    VENCIDA: { label: 'Vencido', variant: 'destructive' },
    PARCIAL: { label: 'Parcial', variant: 'outline' },
    PAGADA: { label: 'Pagada', variant: 'default' },
    PROGRAMADA: { label: 'Programado', variant: 'default' },
  };

  const status = statusMap[estado] || { label: estado, variant: 'outline' };
  return (
    <Badge variant={status.variant}>{status.label}</Badge>
  );
}

export default function InvoicesPage() {
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Facturas
            </h1>
            <p className="mt-1 text-sm text-gray-600">Gestiona todas tus facturas y carga datos desde Excel</p>
          </div>
          <UploadInvoiceButton />
        </div>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Todas las Facturas</CardTitle>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, número de factura..."
                  className="pl-10"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
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
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID FACTURA</TableHead>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>MONTO</TableHead>
                    <TableHead>APLICADO</TableHead>
                    <TableHead>FECHA VENC.</TableHead>
                    <TableHead>ESTADO</TableHead>
                    <TableHead>ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : data?.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        No hay facturas
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {invoice.numero}
                          </Link>
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
                          ${(invoice.monto / 100).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell>
                          ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell>{format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(invoice.estado)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
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
      </div>
    </MainLayout>
  );
}
