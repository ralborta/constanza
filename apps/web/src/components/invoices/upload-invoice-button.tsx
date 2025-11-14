'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UploadResult {
  success: boolean;
  total: number;
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function UploadInvoiceButton() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/v1/invoices/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      
      // Refrescar lista de facturas
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      // Cerrar diálogo después de 3 segundos si fue exitoso
      if (response.data.success && response.data.created > 0) {
        setTimeout(() => {
          setDialogOpen(false);
        }, 3000);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Error al subir el archivo';
      const errorDetails = error.response?.data?.details;
      
      setUploadResult({
        success: false,
        total: 0,
        created: 0,
        skipped: 0,
        errors: [{ row: 0, error: errorMessage + (errorDetails ? `: ${errorDetails}` : '') }],
      });
      
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      // Resetear input
      event.target.value = '';
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg">
          <Upload className="mr-2 h-4 w-4" />
          Cargar desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar Facturas desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) con los datos de tus facturas.
            <br />
            <br />
            <strong>Columnas requeridas:</strong>
            <br />
            - Código Cliente (o &quot;Codigo&quot;, también acepta CUIT o Email)
            <br />
            - Número Factura (o &quot;Nro. Factura&quot;, &quot;Nro&quot;, &quot;Numero&quot;)
            <br />
            - Monto (o &quot;Importe&quot;)
            <br />
            - Fecha Vencimiento (o &quot;Vencimiento&quot;, &quot;Fecha Vto&quot;)
            <br />
            <br />
            <strong>Columnas opcionales:</strong> Estado (ABIERTA, PARCIAL, SALDADA)
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
                    <strong>Creadas:</strong> {uploadResult.created}
                  </p>
                  {uploadResult.skipped > 0 && (
                    <p>
                      <strong>Omitidas:</strong> {uploadResult.skipped}
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
  );
}

