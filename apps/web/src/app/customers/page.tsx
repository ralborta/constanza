'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api, { getApiUrl } from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, Search, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Customer {
  id: string;
  codigoUnico: string;
  codigoVenta: string;
  razonSocial: string;
  email: string;
  telefono?: string;
  activo: boolean;
  accesoHabilitado: boolean;
  cuits: Array<{
    id: string;
    cuit: string;
    razonSocial?: string;
    isPrimary: boolean;
  }>;
  externalRef?: string | null;
}

interface UploadResult {
  success: boolean;
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [manualForm, setManualForm] = useState({
    codigoUnico: '',
    razonSocial: '',
    email: '',
    telefono: '',
    cuit: '',
    codigoVenta: '000',
    externalRef: '',
  });

  const { data, isLoading, isError, error } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/v1/customers');
      return response.data;
    },
  });

  const createManualMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        codigoUnico: manualForm.codigoUnico.trim(),
        razonSocial: manualForm.razonSocial.trim(),
        email: manualForm.email.trim().toLowerCase(),
        codigoVenta: manualForm.codigoVenta.trim() || '000',
      };
      if (manualForm.telefono.trim()) payload.telefono = manualForm.telefono.trim();
      if (manualForm.externalRef.trim()) payload.externalRef = manualForm.externalRef.trim();
      if (manualForm.cuit.trim()) {
        payload.cuits = [{ cuit: manualForm.cuit.trim(), isPrimary: true }];
      }
      const r = await api.post('/v1/customers', payload);
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setManualOpen(false);
      setManualForm({
        codigoUnico: '',
        razonSocial: '',
        email: '',
        telefono: '',
        cuit: '',
        codigoVenta: '000',
        externalRef: '',
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // No especificar Content-Type manualmente - axios lo maneja automáticamente para FormData
      const response = await api.post('/v1/customers/upload', formData);

      setUploadResult(response.data);
      
      // Refrescar lista de clientes
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      // Cerrar diálogo después de 3 segundos si fue exitoso
      if (response.data.success && response.data.created > 0) {
        setTimeout(() => {
          setUploadDialogOpen(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error completo al subir archivo:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = 'Error al subir el archivo';
      
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const apiUrl = getApiUrl();
        if (apiUrl.includes('localhost')) {
          errorMessage = `Error de conexión: La variable NEXT_PUBLIC_API_URL no está configurada en Vercel. Actualmente está usando: ${apiUrl}. Ve a Vercel → Settings → Environment Variables y agrega NEXT_PUBLIC_API_URL con la URL de Railway (ej: https://api-gateway-production.up.railway.app). Luego haz redeploy.`;
        } else {
          errorMessage = `Error de conexión: No se pudo conectar al servidor en ${apiUrl}. Verifica que la API esté corriendo y accesible en Railway.`;
        }
      } else if (error.response) {
        // El servidor respondió con un código de error
        errorMessage = error.response.data?.error || error.response.data?.details || error.response.statusText || 'Error del servidor';
        const errorDetails = error.response.data?.details;
        if (errorDetails) {
          errorMessage += `: ${errorDetails}`;
        }
      } else if (error.request) {
        // La petición se hizo pero no hubo respuesta
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión a internet y que el servidor esté corriendo.';
      } else {
        errorMessage = error.message || 'Error desconocido';
      }
      
      setUploadResult({
        success: false,
        total: 0,
        created: 0,
        skipped: 0,
        errors: [{ row: 0, error: errorMessage }],
      });
    } finally {
      setUploading(false);
      // Resetear input
      event.target.value = '';
    }
  };

  const filteredCustomers = (data?.customers ?? []).filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.razonSocial.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.codigoUnico.toLowerCase().includes(search) ||
      customer.cuits.some((c) => c.cuit.includes(search))
    );
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Clientes
            </h1>
            <p className="mt-1 text-sm text-gray-600">Gestiona tus clientes y carga datos desde Excel</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Alta manual de cliente</DialogTitle>
                  <DialogDescription>
                    El <strong>CVU</strong> es la llave del cliente para conciliar transferencias Cresium (mismo valor que en
                    el banco). Para un ERP podés usar &quot;ID en ERP&quot;. API:{' '}
                    <code className="text-xs bg-muted px-1 rounded">POST /v1/integrations/ingest</code>.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">CVU (clave cliente / Cresium) *</Label>
                    <Input
                      value={manualForm.codigoUnico}
                      onChange={(e) => setManualForm((f) => ({ ...f, codigoUnico: e.target.value }))}
                      placeholder="22 dígitos o referencia acordada"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Razón social *</Label>
                    <Input
                      value={manualForm.razonSocial}
                      onChange={(e) => setManualForm((f) => ({ ...f, razonSocial: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      value={manualForm.email}
                      onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      value={manualForm.telefono}
                      onChange={(e) => setManualForm((f) => ({ ...f, telefono: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CUIT</Label>
                    <Input
                      value={manualForm.cuit}
                      onChange={(e) => setManualForm((f) => ({ ...f, cuit: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Código venta</Label>
                    <Input
                      value={manualForm.codigoVenta}
                      onChange={(e) => setManualForm((f) => ({ ...f, codigoVenta: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ID en ERP (externalRef)</Label>
                    <Input
                      value={manualForm.externalRef}
                      onChange={(e) => setManualForm((f) => ({ ...f, externalRef: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  {createManualMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {(createManualMutation.error as any)?.response?.data?.error || 'Error al crear'}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    onClick={() => createManualMutation.mutate()}
                    disabled={createManualMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {createManualMutation.isPending ? 'Guardando…' : 'Crear cliente'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar desde Excel
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cargar Clientes desde Excel</DialogTitle>
                <DialogDescription>
                  Sube un archivo Excel (.xlsx) con los datos de tus clientes.
                  <br />
                  <br />
                  <strong>Columnas requeridas:</strong> Código Único (o &quot;Codigo&quot;), Razón Social (o &quot;Nombre&quot;/&quot;Nombrte&quot;), Email (o &quot;email&quot;)
                  <br />
                  <strong>Columnas opcionales:</strong> Teléfono (o &quot;telefono&quot;), CUIT (o &quot;cuit&quot;), Código Venta (o &quot;Codigo Ventas&quot;)
                  <br />
                  <br />
                  <span className="text-xs text-gray-500">
                    Los nombres de columnas son flexibles: se aceptan mayúsculas/minúsculas, con o sin acentos, y variaciones comunes.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>

                {uploading && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Procesando archivo...</AlertDescription>
                  </Alert>
                )}

                {uploadResult && (
                  <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
                    {uploadResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>
                          <strong>Total:</strong> {uploadResult.total} filas
                        </p>
                        <p>
                          <strong>Creados:</strong> {uploadResult.created}
                        </p>
                        {uploadResult.skipped > 0 && (
                          <p>
                            <strong>Omitidos:</strong> {uploadResult.skipped}
                          </p>
                        )}
                        {uploadResult.errors.length > 0 && (
                          <div className="mt-2">
                            <strong>Errores:</strong>
                            <ul className="list-disc list-inside mt-1 text-sm">
                              {uploadResult.errors.slice(0, 5).map((error, idx) => (
                                <li key={idx}>
                                  Fila {error.row}: {error.error}
                                </li>
                              ))}
                              {uploadResult.errors.length > 5 && (
                                <li>... y {uploadResult.errors.length - 5} errores más</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(error as { response?: { status?: number; data?: { error?: string } } })?.response?.status ===
              403 ? (
                <>
                  Esta página solo está disponible para administradores u operadores. Los usuarios con perfil
                  cliente no pueden ver el listado de clientes.
                </>
              ) : (
                (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data
                  ?.error ||
                (error as Error)?.message ||
                'No se pudieron cargar los clientes. Revisá la consola del navegador y que NEXT_PUBLIC_API_URL apunte al API Gateway.'
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-800">Lista de Clientes</CardTitle>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por razón social, email, CVU o CUIT..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-indigo-50 to-blue-50">
                    <TableHead className="font-semibold text-gray-800">CVU</TableHead>
                    <TableHead className="font-semibold text-gray-800">Razón Social</TableHead>
                    <TableHead className="font-semibold text-gray-800">Email</TableHead>
                    <TableHead className="font-semibold text-gray-800">Teléfono</TableHead>
                    <TableHead className="font-semibold text-gray-800">CUIT</TableHead>
                    <TableHead className="font-semibold text-gray-800">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-destructive text-sm">
                        No se pudo cargar la lista (ver mensaje arriba).
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers?.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-semibold text-indigo-600">{customer.codigoUnico}</TableCell>
                        <TableCell className="font-medium text-gray-900">{customer.razonSocial}</TableCell>
                        <TableCell className="text-blue-600">{customer.email}</TableCell>
                        <TableCell>{customer.telefono || '-'}</TableCell>
                        <TableCell>
                          {customer.cuits.find((c) => c.isPrimary)?.cuit || '-'}
                        </TableCell>
                        <TableCell>
                          {customer.activo ? (
                            <span className="text-green-600">Activo</span>
                          ) : (
                            <span className="text-gray-400">Inactivo</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {data && data.customers.length > 0 && (
              <div className="mt-4 text-sm text-gray-500">
                Mostrando {filteredCustomers?.length || 0} de {data.customers.length} clientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

