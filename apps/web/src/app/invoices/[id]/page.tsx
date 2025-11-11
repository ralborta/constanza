'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';

interface TimelineItem {
  type: 'CONTACT' | 'PROMISE' | 'PAYMENT';
  channel?: string;
  direction?: string;
  message?: string;
  status?: string;
  amount?: number;
  dueDate?: string;
  isAuthoritative?: boolean;
  sourceSystem?: string;
  appliedAt?: string;
  settledAt?: string;
  ts: string;
}

interface InvoiceDetail {
  invoice: {
    id: string;
    customer: {
      id: string;
      razonSocial: string;
      cuits: Array<{ cuit: string; isPrimary: boolean }>;
    };
    numero: string;
    monto: number;
    montoAplicado: number;
    fechaVto: string;
    estado: string;
    applications: Array<{
      id: string;
      amount: number;
      isAuthoritative: boolean;
      appliedAt: string;
      payment: {
        sourceSystem: string;
        method: string;
        status: string;
        settledAt?: string;
      };
    }>;
    timeline: TimelineItem[];
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const { data, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await api.get(`/v1/invoices/${invoiceId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Factura no encontrada</p>
      </div>
    );
  }

  const { invoice } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Volver
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                Factura {invoice.numero}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de la factura */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cliente</h3>
              <p className="text-lg font-medium text-gray-900">{invoice.customer.razonSocial}</p>
              {invoice.customer.cuits.length > 0 && (
                <p className="text-sm text-gray-500">
                  CUIT: {invoice.customer.cuits.find((c) => c.isPrimary)?.cuit}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Monto</h3>
              <p className="text-2xl font-bold text-gray-900">
                ${(invoice.monto / 100).toLocaleString('es-AR')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Aplicado: ${(invoice.montoAplicado / 100).toLocaleString('es-AR')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Vencimiento</h3>
              <p className="text-lg text-gray-900">
                        {format(new Date(invoice.fechaVto), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Estado</h3>
              <span
                className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                  invoice.estado === 'ABIERTA'
                    ? 'bg-yellow-100 text-yellow-800'
                    : invoice.estado === 'PARCIAL'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {invoice.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {invoice.timeline.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay eventos en el timeline</p>
              ) : (
                invoice.timeline.map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          {item.type === 'CONTACT' && (
                            <p className="text-sm font-medium text-gray-900">
                              {item.channel} - {item.direction}
                            </p>
                          )}
                          {item.type === 'PROMISE' && (
                            <p className="text-sm font-medium text-gray-900">
                              Promesa de pago
                            </p>
                          )}
                          {item.type === 'PAYMENT' && (
                            <p className="text-sm font-medium text-gray-900">
                              Pago aplicado
                              {item.isAuthoritative && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Autoritativo ({item.sourceSystem})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      {item.message && (
                        <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                      )}
                      {item.amount && (
                        <p className="text-sm text-gray-600 mt-1">
                          Monto: ${(item.amount / 100).toLocaleString('es-AR')}
                        </p>
                      )}
                      {item.status && (
                        <span
                          className={`mt-2 inline-flex text-xs px-2 py-1 rounded ${
                            item.status === 'SENT' || item.status === 'DELIVERED'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

