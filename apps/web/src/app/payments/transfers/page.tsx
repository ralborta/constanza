'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Transfer {
  id: string;
  sourceSystem: string;
  status: string;
  externalRef: string | null;
  createdAt: string;
  settledAt: string | null;
  totalAmount: number;
  applications: Array<{
    id: string;
    invoice: {
      id: string;
      numero: string;
      customer: {
        razonSocial: string;
        codigoUnico: string;
      };
    };
    amount: number;
    isAuthoritative: boolean;
    appliedAt: string;
  }>;
}

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceSystemFilter, setSourceSystemFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{
    transfers: Transfer[];
    total: number;
    totalAmount: number;
  }>({
    queryKey: ['payments-transfers', statusFilter, sourceSystemFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (sourceSystemFilter !== 'all') {
        params.sourceSystem = sourceSystemFilter;
      }
      const response = await api.get('/v1/payments/transfers', { params });
      return response.data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APLICADO':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aplicado
          </Badge>
        );
      case 'PEND_LIQ':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente Liquidación
          </Badge>
        );
      case 'LIQUIDADO':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Liquidado
          </Badge>
        );
      case 'RECHAZADO':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceSystemBadge = (sourceSystem: string) => {
    switch (sourceSystem) {
      case 'CUCURU':
        return <Badge className="bg-blue-100 text-blue-700">Cucuru</Badge>;
      case 'BINDX':
        return <Badge className="bg-purple-100 text-purple-700">BindX</Badge>;
      case 'MANUAL':
        return <Badge className="bg-gray-100 text-gray-700">Manual</Badge>;
      default:
        return <Badge variant="outline">{sourceSystem}</Badge>;
    }
  };

  const filteredTransfers = data?.transfers.filter((transfer) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        transfer.externalRef?.toLowerCase().includes(search) ||
        transfer.applications.some((app) =>
          app.invoice.numero.toLowerCase().includes(search) ||
          app.invoice.customer.razonSocial.toLowerCase().includes(search)
        )
      );
    }
    return true;
  }) || [];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Transferencias Bancarias
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Pagos recibidos por transferencias bancarias
          </p>
        </div>

        {/* Resumen */}
        {data && (
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Transferencias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.total}</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Monto Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ${(data.totalAmount / 100).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Mostrando</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{filteredTransfers.length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Lista de Transferencias</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por referencia, factura o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="APLICADO">Aplicado</SelectItem>
                    <SelectItem value="PEND_LIQ">Pendiente Liquidación</SelectItem>
                    <SelectItem value="LIQUIDADO">Liquidado</SelectItem>
                    <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceSystemFilter} onValueChange={setSourceSystemFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los orígenes</SelectItem>
                    <SelectItem value="CUCURU">Cucuru</SelectItem>
                    <SelectItem value="BINDX">BindX</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Cargando transferencias...</p>
              </div>
            ) : !data || filteredTransfers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No se encontraron transferencias</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <TableHead className="font-semibold text-gray-800">Fecha</TableHead>
                    <TableHead className="font-semibold text-gray-800">Origen</TableHead>
                    <TableHead className="font-semibold text-gray-800">Referencia Externa</TableHead>
                    <TableHead className="font-semibold text-gray-800">Monto</TableHead>
                    <TableHead className="font-semibold text-gray-800">Estado</TableHead>
                    <TableHead className="font-semibold text-gray-800">Facturas</TableHead>
                    <TableHead className="font-semibold text-gray-800">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm">
                        {format(new Date(transfer.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>{getSourceSystemBadge(transfer.sourceSystem)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {transfer.externalRef || '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        ${(transfer.totalAmount / 100).toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {transfer.applications.map((app) => (
                            <div key={app.id} className="text-sm">
                              <Link
                                href={`/invoices/${app.invoice.id}`}
                                className="text-emerald-600 hover:text-emerald-800 hover:underline"
                              >
                                {app.invoice.numero}
                              </Link>
                              <span className="text-gray-500 ml-2">
                                ${(app.amount / 100).toLocaleString('es-AR')}
                              </span>
                              {app.isAuthoritative && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  🔒 Autoritativo
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/payments/${transfer.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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

