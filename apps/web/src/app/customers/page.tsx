'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
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
import { Upload, Download, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/v1/customers');
      return response.data;
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

      const response = await api.post('/v1/customers/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
      setUploadResult({
        success: false,
        total: 0,
        created: 0,
        skipped: 0,
        errors: [{ row: 0, error: error.response?.data?.error || 'Error al subir el archivo' }],
      });
    } finally {
      setUploading(false);
      // Resetear input
      event.target.value = '';
    }
  };

  const filteredCustomers = data?.customers.filter((customer) => {
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
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">Gestiona tus clientes y carga datos desde Excel</p>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
                  <strong>Columnas requeridas:</strong> Código Único, Razón Social, Email
                  <br />
                  <strong>Columnas opcionales:</strong> Teléfono, CUIT, Código Venta
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Clientes</CardTitle>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por razón social, email, código o CUIT..."
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
                  <TableRow>
                    <TableHead>Código Único</TableHead>
                    <TableHead>Razón Social</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Cargando...
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
                        <TableCell className="font-medium">{customer.codigoUnico}</TableCell>
                        <TableCell>{customer.razonSocial}</TableCell>
                        <TableCell>{customer.email}</TableCell>
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

