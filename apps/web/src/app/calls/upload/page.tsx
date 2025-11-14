'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function CallsUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/v1/calls/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Redirigir a la página de batches con el batchId
      router.push(`/calls/batches?batchId=${data.batchId}`);
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cargar Batch de Llamadas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sube un archivo Excel con los datos de las llamadas telefónicas
          </p>
        </div>

        <div className="max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Formato del Archivo Excel</CardTitle>
              <CardDescription>
                El archivo debe contener las siguientes columnas:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-gray-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Columna</th>
                        <th className="text-left p-2 font-semibold">Requerido</th>
                        <th className="text-left p-2 font-semibold">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-mono">customer_codigo_unico</td>
                        <td className="p-2">Uno de los dos</td>
                        <td className="p-2">Código único del cliente</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono">customer_cuit</td>
                        <td className="p-2">Uno de los dos</td>
                        <td className="p-2">CUIT del cliente</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono">telefono</td>
                        <td className="p-2">Opcional</td>
                        <td className="p-2">Teléfono (si no está, usa el del cliente)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono">script</td>
                        <td className="p-2">Requerido</td>
                        <td className="p-2">Script de la llamada</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono">variables</td>
                        <td className="p-2">Opcional</td>
                        <td className="p-2">JSON con variables (ej: {`{"monto": "120000"}`})</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono">invoice_numero</td>
                        <td className="p-2">Opcional</td>
                        <td className="p-2">Número de factura relacionada</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Arrastra un archivo Excel aquí o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" asChild>
                      <span>Seleccionar archivo</span>
                    </Button>
                  </label>
                  {file && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{file.name}</span>
                      <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                {uploadMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(uploadMutation.error as any)?.response?.data?.error ||
                        'Error al cargar el archivo'}
                      {(uploadMutation.error as any)?.response?.data?.errorDetails && (
                        <div className="mt-2 text-xs">
                          <p className="font-semibold">Errores encontrados:</p>
                          <ul className="list-disc list-inside mt-1">
                            {(uploadMutation.error as any).response.data.errorDetails
                              .slice(0, 5)
                              .map((err: any, idx: number) => (
                                <li key={idx}>
                                  Fila {err.row}: {err.error}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {uploadMutation.isSuccess && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">¡Archivo cargado exitosamente!</p>
                      <p className="text-sm mt-1">
                        {uploadMutation.data.processedRows} llamadas procesadas. Redirigiendo...
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploadMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Cargar Batch de Llamadas
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

