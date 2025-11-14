'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, MessageSquare, Phone, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Customer {
  id: string;
  codigoUnico: string;
  razonSocial: string;
  email: string;
  telefono?: string;
  activo: boolean;
}

interface BatchResult {
  batchId: string;
  totalMessages: number;
  queued: number;
  status: string;
}

export default function NotifyPage() {
  const queryClient = useQueryClient();
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers, isLoading: customersLoading } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/v1/customers');
      return response.data;
    },
  });

  const sendBatchMutation = useMutation({
    mutationFn: async (data: {
      customerIds: string[];
      channel: 'EMAIL' | 'WHATSAPP';
      message: { text?: string; body?: string; subject?: string };
    }) => {
      const response = await api.post('/v1/notify/batch', data);
      return response.data as BatchResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // Limpiar formulario
      setSelectedCustomers(new Set());
      setMessage('');
      setSubject('');
    },
  });

  const handleToggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const handleSend = async () => {
    if (selectedCustomers.size === 0) {
      return;
    }

    if (!message.trim()) {
      return;
    }

    if (channel === 'EMAIL' && !subject.trim()) {
      return;
    }

    const messageData: { text?: string; body?: string; subject?: string } = {
      text: message,
      body: message,
    };

    if (channel === 'EMAIL') {
      messageData.subject = subject;
    }

    sendBatchMutation.mutate({
      customerIds: Array.from(selectedCustomers),
      channel,
      message: messageData,
    });
  };

  const filteredCustomers = customers?.customers.filter((customer) => {
    if (!customer.activo) return false;
    
    // Filtrar según canal
    if (channel === 'EMAIL' && !customer.email) return false;
    if (channel === 'WHATSAPP' && !customer.telefono) return false;

    const search = searchTerm.toLowerCase();
    return (
      customer.razonSocial.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.codigoUnico.toLowerCase().includes(search)
    );
  }) || [];

  const canSend = selectedCustomers.size > 0 && message.trim() && (channel === 'WHATSAPP' || subject.trim());

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Enviar Notificaciones
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Envía emails o mensajes de WhatsApp a múltiples clientes
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Panel izquierdo: Selección de clientes */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-800">Seleccionar Clientes</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCustomers.size === filteredCustomers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                </div>
                <div className="mt-4">
                  <Input
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customersLoading ? (
                    <p className="text-center text-gray-500 py-8">Cargando clientes...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles'}
                    </p>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border"
                      >
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={() => handleToggleCustomer(customer.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{customer.razonSocial}</p>
                          <p className="text-xs text-gray-500">
                            {channel === 'EMAIL' ? customer.email : customer.telefono || 'Sin teléfono'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">{customer.codigoUnico}</span>
                      </div>
                    ))
                  )}
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="mt-4 text-sm text-gray-500">
                    {selectedCustomers.size} de {filteredCustomers.length} clientes seleccionados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho: Configuración y envío */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-gray-800">Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Canal</Label>
                  <Select value={channel} onValueChange={(value: 'EMAIL' | 'WHATSAPP') => setChannel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                      <SelectItem value="WHATSAPP">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {channel === 'EMAIL' && (
                  <div>
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      placeholder="Asunto del email..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Mensaje</Label>
                  <Textarea
                    id="message"
                    placeholder={
                      channel === 'EMAIL'
                        ? 'Escribe el mensaje del email...'
                        : 'Escribe el mensaje de WhatsApp...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes usar variables como {'{nombre_cliente}'}, {'{monto}'}, etc.
                  </p>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!canSend || sendBatchMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                  size="lg"
                >
                  {sendBatchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar a {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {sendBatchMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(sendBatchMutation.error as any)?.response?.data?.error || 'Error al enviar mensajes'}
                    </AlertDescription>
                  </Alert>
                )}

                {sendBatchMutation.isSuccess && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div>
                        <p className="font-medium">¡Mensajes en cola!</p>
                        <p className="text-sm mt-1">
                          {sendBatchMutation.data.totalMessages} mensajes se están enviando uno por uno.
                          Puedes ver el progreso en el dashboard.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="text-gray-800">Información</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  • Los mensajes se envían <strong>uno por uno</strong> con rate limiting para no saturar los servicios
                </p>
                <p>
                  • Solo se muestran clientes que tienen {channel === 'EMAIL' ? 'email' : 'teléfono'} configurado
                </p>
                <p>• Los mensajes se procesan en segundo plano y aparecerán en el timeline de facturas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

