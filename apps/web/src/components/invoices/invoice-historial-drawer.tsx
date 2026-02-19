'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InvoiceHistorialView, type InvoiceHistorialData } from './invoice-historial-view';
import { ExternalLink, Loader2 } from 'lucide-react';

interface InvoiceHistorialDrawerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceHistorialDrawer({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceHistorialDrawerProps) {
  const { data, isLoading, error } = useQuery<InvoiceHistorialData>({
    queryKey: ['invoice-historial', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/v1/invoices/${invoiceId}`);
      return res.data;
    },
    enabled: open && !!invoiceId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden p-0 sm:max-w-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Historial de la factura</span>
            {invoiceId && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/invoices/${invoiceId}/historial`} onClick={() => onOpenChange(false)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver página completa
                </Link>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-4">
          {!invoiceId ? (
            <p className="text-sm text-gray-500">Seleccioná una factura.</p>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <p className="mt-3 text-sm text-gray-500">Cargando historial...</p>
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">
              No se pudo cargar el historial. {(error as any)?.response?.data?.error || (error as Error).message}
            </p>
          ) : data ? (
            <InvoiceHistorialView data={data} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
