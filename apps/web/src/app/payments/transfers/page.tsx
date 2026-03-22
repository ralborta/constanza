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
import { Search, Loader2, CheckCircle2, Clock, XCircle, Eye, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState<'uuid' | 'env' | null>(null);

  const copyText = async (text: string, kind: 'uuid' | 'env') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const { data, isLoading, isError, error } = useQuery<{
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

  /** Tenant real del JWT (mismo que filtra la API). Si no coincide con CRESIUM_TENANT_ID o con pay.payments, la lista queda vacía. */
  const { data: session } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const r = await api.get<{
        tenantId: string;
        tenantName: string | null;
        email: string | null;
      }>('/auth/me');
      return r.data;
    },
    staleTime: 60_000,
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
      case 'CRESIUM':
        return <Badge className="bg-cyan-100 text-cyan-800">Cresium</Badge>;
      case 'MANUAL':
        return <Badge className="bg-gray-100 text-gray-700">Manual</Badge>;
      default:
        return <Badge variant="outline">{sourceSystem}</Badge>;
    }
  };

  const filteredTransfers = data?.transfers.filter((transfer) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const apps = transfer.applications ?? [];
      return (
        transfer.externalRef?.toLowerCase().includes(search) ||
        apps.some(
          (app) =>
            app.invoice?.numero?.toLowerCase().includes(search) ||
            app.invoice?.customer?.razonSocial?.toLowerCase().includes(search)
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

        {/* Prueba: mismo UUID en sesión (JWT) y en CRESIUM_TENANT_ID (Railway rail-cucuru) */}
        {session && (
          <Card className="mb-6 border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cyan-900">
                Prueba Cresium — coincidencia de IDs
              </CardTitle>
              <p className="text-sm text-gray-700">
                Tu usuario ({session.email ?? 'sesión'}) ve solo pagos del tenant del token. Los webhooks guardan con{' '}
                <code className="rounded bg-white px-1 py-0.5 text-xs">CRESIUM_TENANT_ID</code>. Para la prueba, ese
                valor tiene que ser <strong>exactamente el mismo</strong> que abajo.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  1) Tenant de tu usuario (sesión API / JWT)
                </p>
                <code className="mt-1 block break-all rounded border border-cyan-100 bg-white px-2 py-2 text-sm">
                  {session.tenantId}
                </code>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  2) Poné este mismo UUID en Railway → servicio rail-cucuru → variable{' '}
                  <code className="rounded bg-cyan-100 px-1">CRESIUM_TENANT_ID</code>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-cyan-300 bg-white"
                    onClick={() => copyText(session.tenantId, 'uuid')}
                  >
                    {copied === 'uuid' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copiar UUID
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 border-cyan-300 bg-white"
                    onClick={() =>
                      copyText(`CRESIUM_TENANT_ID=${session.tenantId}`, 'env')
                    }
                  >
                    {copied === 'env' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copiar línea .env
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Guardá en Railway, redeploy <strong>rail-cucuru</strong>. Depósitos nuevos quedarán alineados. Si ya
                  hay filas en <code className="rounded bg-white px-0.5">pay.payments</code> con otro{' '}
                  <code className="rounded bg-white px-0.5">tenant_id</code>, actualizalas o repetí el webhook de
                  prueba.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <strong>Error al cargar transferencias.</strong>{' '}
            {(error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error ??
              (error as Error)?.message ??
              'Revisá la consola de red / que NEXT_PUBLIC_API_URL apunte al api-gateway.'}
          </div>
        )}

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
                    <SelectItem value="CRESIUM">Cresium</SelectItem>
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
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-gray-500">No se encontraron transferencias</p>
                {data && data.total === 0 && !searchTerm && (
                  <div className="text-xs text-amber-900 max-w-2xl mx-auto space-y-2 text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="font-medium">Diagnóstico (ambos usuarios ven lo mismo → mismo tenant en el token)</p>
                    {session && (
                      <p>
                        <span className="text-gray-600">Tu sesión API usa tenant:</span>{' '}
                        <code className="bg-amber-100 px-1 rounded break-all">{session.tenantId}</code>
                        {session.tenantName ? (
                          <span className="text-gray-600"> ({session.tenantName})</span>
                        ) : null}
                      </p>
                    )}
                    <ul className="list-disc pl-4 space-y-1 text-gray-700">
                      <li>
                        En <strong>rail-cucuru</strong>: <code className="bg-amber-100 px-1">CRESIUM_TENANT_ID</code>{' '}
                        debe ser <strong>exactamente</strong> ese UUID (los depósitos se insertan con ese tenant).
                      </li>
                      <li>
                        <strong>Misma base:</strong> <code className="bg-amber-100 px-1">DATABASE_URL</code> de{' '}
                        <strong>rail-cucuru</strong> y <strong>api-gateway</strong> tiene que apuntar al mismo Postgres
                        donde mirás los datos; si el webhook escribe en otra DB, acá nunca va a aparecer.
                      </li>
                      <li>
                        En SQL:{' '}
                        <code className="bg-amber-100 px-0.5 text-[11px] break-all">
                          SELECT tenant_id, method, source_system, external_ref FROM pay.payments WHERE source_system =
                          &apos;CRESIUM&apos; ORDER BY created_at DESC LIMIT 5;
                        </code>
                      </li>
                    </ul>
                  </div>
                )}
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
                          {transfer.applications.length === 0 ? (
                            <span className="text-sm text-amber-700">
                              Sin imputación — usar conciliación o POST{' '}
                              <code className="text-xs">/v1/payments/…/impute</code>
                            </span>
                          ) : (
                            transfer.applications.map((app) => (
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
                            ))
                          )}
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

