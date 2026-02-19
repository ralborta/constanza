'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { InvoiceHistorialView, type InvoiceHistorialData } from '@/components/invoices/invoice-historial-view';

export default function InvoiceHistorialPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const { data, isLoading, error } = useQuery<InvoiceHistorialData>({
    queryKey: ['invoice-historial', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/v1/invoices/${invoiceId}`);
      return res.data;
    },
    enabled: !!invoiceId,
  });

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/invoices/${invoiceId}`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la factura
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Historial de la factura
            </h1>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/invoices/${invoiceId}`}>Ver detalle completo</Link>
          </Button>
        </div>

        {!invoiceId ? (
          <p className="text-gray-500">Factura no especificada.</p>
        ) : isLoading ? (
          <p className="text-gray-500">Cargando historial...</p>
        ) : error ? (
          <p className="text-red-600">
            No se pudo cargar el historial. {(error as any)?.response?.data?.error || (error as Error).message}
          </p>
        ) : data ? (
          <InvoiceHistorialView data={data} />
        ) : null}
      </div>
    </MainLayout>
  );
}
