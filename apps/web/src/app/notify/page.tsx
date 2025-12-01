'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Eye,
  EyeOff,
  Users,
  Sparkles,
  FileText
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Customer {
  id: string;
  codigoUnico: string;
  razonSocial: string;
  email: string;
  telefono?: string;
  activo: boolean;
}

interface InvoiceSummary {
  id: string;
  numero: string;
  monto: number;
  fechaVto: string;
  estado: string;
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
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP' | 'VOICE'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, string[]>>({});
  const [invoicesByCustomer, setInvoicesByCustomer] = useState<Record<string, InvoiceSummary[]>>({});
  const [includeInvoiceSummary, setIncludeInvoiceSummary] = useState(true);

  const handleInvoicesLoaded = useCallback((customerId: string, invoices: InvoiceSummary[]) => {
    setInvoicesByCustomer((prev) => {
      const existing = prev[customerId];
      const isSame =
        existing &&
        existing.length === invoices.length &&
        existing.every((inv, idx) => {
          const next = invoices[idx];
          return (
            inv.id === next.id &&
            inv.estado === next.estado &&
            inv.monto === next.monto &&
            inv.fechaVto === next.fechaVto
          );
        });

      if (isSame) {
        return prev;
      }

      return {
        ...prev,
        [customerId]: invoices,
      };
    });
  }, []);

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
      channel: 'EMAIL' | 'WHATSAPP' | 'VOICE';
      message: { text?: string; body?: string; subject?: string };
      invoiceIdsByCustomer?: Record<string, string[]>;
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
      setMessageTemplate('');
      setShowPreview(false);
      setSelectedInvoices({});
      setInvoicesByCustomer({});
    },
  });

  // Plantillas de mensajes comunes
  const messageTemplates = {
    EMAIL: {
      'Recordatorio de pago': 'Estimado/a {nombre_cliente},\n\nLe recordamos que tiene una factura pendiente de pago.\n\nPor favor, realice el pago a la brevedad para evitar intereses.\n\nSaludos cordiales.',
      'Factura vencida': 'Estimado/a {nombre_cliente},\n\nSu factura se encuentra vencida. Por favor, contáctenos para regularizar su situación.\n\nSaludos cordiales.',
      'Confirmación de pago': 'Estimado/a {nombre_cliente},\n\nHemos recibido su pago correctamente. Muchas gracias.\n\nSaludos cordiales.',
    },
    WHATSAPP: {
      'Recordatorio corto': 'Hola {nombre_cliente}, te recordamos que tienes una factura pendiente. Por favor, realiza el pago a la brevedad. Gracias!',
      'Factura vencida': 'Hola {nombre_cliente}, tu factura está vencida. Por favor contáctanos para regularizar. Gracias!',
      'Confirmación': 'Hola {nombre_cliente}, hemos recibido tu pago. ¡Gracias!',
    },
    VOICE: {
      'Recordatorio': 'Hola {nombre_cliente}, te recordamos que tienes una factura pendiente de pago. Por favor, realiza el pago a la brevedad. Gracias.',
    },
  };

  const handleTemplateSelect = (template: string) => {
    setMessage(template);
    setMessageTemplate(template);
  };

  const handleToggleCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
      setSelectedInvoices((prev) => {
        if (!prev[customerId]) return prev;
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
      setInvoicesByCustomer((prev) => {
        if (!prev[customerId]) return prev;
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
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

    if (channel === 'EMAIL' && !subject.trim()) {
      return;
    }

    const invoiceSummaryText = buildInvoiceSummaryText({
      includeInvoiceSummary,
      selectedCustomers,
      selectedInvoices,
      invoicesByCustomer,
    });

    const combinedMessage = `${message}`.trim().length > 0
      ? `${message.trim()}${invoiceSummaryText}`
      : invoiceSummaryText.trim();

    if (!combinedMessage) {
      return;
    }

    const messageData: { text?: string; body?: string; subject?: string } = {
      text: combinedMessage,
      body: combinedMessage,
    };

    if (channel === 'EMAIL') {
      messageData.subject = subject;
    }

    const invoiceIdsByCustomerPayload = buildInvoiceIdsPayload(selectedCustomers, selectedInvoices);

    sendBatchMutation.mutate({
      customerIds: Array.from(selectedCustomers),
      channel,
      message: messageData,
      invoiceIdsByCustomer: Object.keys(invoiceIdsByCustomerPayload).length
        ? invoiceIdsByCustomerPayload
        : undefined,
    });
  };

  const filteredCustomers = customers?.customers.filter((customer) => {
    if (!customer.activo) return false;
    
    // Filtrar según canal
    if (channel === 'EMAIL' && !customer.email) return false;
    if ((channel === 'WHATSAPP' || channel === 'VOICE') && !customer.telefono) return false;

    const search = searchTerm.toLowerCase();
    return (
      customer.razonSocial.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.codigoUnico.toLowerCase().includes(search)
    );
  }) || [];

  const invoiceSummaryText = useMemo(
    () =>
      buildInvoiceSummaryText({
        includeInvoiceSummary,
        selectedCustomers,
        selectedInvoices,
        invoicesByCustomer,
      }),
    [includeInvoiceSummary, selectedCustomers, selectedInvoices, invoicesByCustomer]
  );

  const messageWithSummary = `${message}`.trim().length > 0
    ? `${message.trim()}${invoiceSummaryText}`
    : invoiceSummaryText;

  const canSend =
    selectedCustomers.size > 0 && messageWithSummary.trim() && (channel !== 'EMAIL' || subject.trim());
  
  // Contador de caracteres (WhatsApp tiene límite de 4096)
  const charCount = messageWithSummary.length;
  const charLimit = channel === 'WHATSAPP' ? 4096 : channel === 'EMAIL' ? 10000 : 5000;
  const isCharLimitExceeded = charCount > charLimit;

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header mejorado */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Enviar Mensajes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Comunícate con tus clientes por Email, WhatsApp o Llamada
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Panel izquierdo: Selección de clientes */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Seleccionar Clientes</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedCustomers.size === filteredCustomers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                </div>
                <CardDescription>
                  Busca y selecciona los clientes que recibirán el mensaje
                </CardDescription>
                <div className="mt-4">
                  <Input
                    placeholder="Buscar por nombre, email o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {customersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Cargando clientes...</span>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'No se encontraron clientes' : `No hay clientes con ${channel === 'EMAIL' ? 'email' : 'teléfono'} configurado`}
                      </p>
                    </div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <div key={customer.id} className="space-y-2">
                        <div
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedCustomers.has(customer.id)
                              ? 'bg-green-50 border-green-200 shadow-sm'
                              : 'hover:bg-muted/50 border-border'
                          }`}
                          onClick={() => handleToggleCustomer(customer.id)}
                        >
                          <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={() => handleToggleCustomer(customer.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{customer.razonSocial}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {channel === 'EMAIL' ? (
                                <Mail className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Phone className="h-3 w-3 text-muted-foreground" />
                              )}
                              <p className="text-xs text-muted-foreground">
                                {channel === 'EMAIL' ? customer.email : customer.telefono || 'Sin teléfono'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {customer.codigoUnico}
                          </Badge>
                        </div>
                        {selectedCustomers.has(customer.id) && (
                          <CustomerInvoices
                            customerId={customer.id}
                            selectedInvoices={selectedInvoices[customer.id] || []}
                            onToggleInvoice={(invoiceId) => {
                              setSelectedInvoices((prev) => {
                                const current = new Set(prev[customer.id] || []);
                                if (current.has(invoiceId)) {
                                  current.delete(invoiceId);
                                } else {
                                  current.add(invoiceId);
                                }
                                const next = Array.from(current);
                                if (next.length === 0) {
                                  const { [customer.id]: _, ...rest } = prev;
                                  return rest;
                                }
                                return {
                                  ...prev,
                                  [customer.id]: next,
                                };
                              });
                            }}
                            onInvoicesLoaded={handleInvoicesLoaded}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        <Users className="h-4 w-4 inline mr-1" />
                        {selectedCustomers.size} de {filteredCustomers.length} seleccionados
                      </span>
                      {selectedCustomers.size > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho: Configuración y envío */}
          <div className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Componer Mensaje</CardTitle>
                </div>
                <CardDescription>
                  Configura el canal y redacta tu mensaje
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Selector de canal */}
                <div className="space-y-2">
                  <Label>Canal de comunicación</Label>
                  <Select value={channel} onValueChange={(value: 'EMAIL' | 'WHATSAPP' | 'VOICE') => {
                    setChannel(value);
                    setMessage('');
                    setSubject('');
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <span>Email</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="WHATSAPP">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <span>WhatsApp</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="VOICE">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-purple-600" />
                          <span>Llamada de voz</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Asunto (solo para EMAIL) */}
                {channel === 'EMAIL' && (
                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto del email</Label>
                    <Input
                      id="subject"
                      placeholder="Ej: Recordatorio de pago pendiente"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={!subject.trim() && selectedCustomers.size > 0 ? 'border-orange-300' : ''}
                    />
                  </div>
                )}

                {/* Plantillas */}
                {Object.keys(messageTemplates[channel] || {}).length > 0 && (
                  <div className="space-y-2">
                    <Label>Plantillas rápidas</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(messageTemplates[channel] || {}).map(([name, template]) => (
                        <Button
                          key={name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect(template)}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Editor de mensaje */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message">
                      {channel === 'EMAIL' ? 'Cuerpo del mensaje' : channel === 'WHATSAPP' ? 'Mensaje de WhatsApp' : 'Script de llamada'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="h-7 text-xs"
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Ocultar vista previa
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Vista previa
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {!showPreview ? (
                    <>
                      <Textarea
                        id="message"
                        placeholder={
                          channel === 'EMAIL'
                            ? 'Escribe el contenido del email...'
                            : channel === 'WHATSAPP'
                            ? 'Escribe el mensaje de WhatsApp...'
                            : 'Escribe el script para la llamada...'
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={8}
                        className={`font-mono text-sm ${
                          isCharLimitExceeded ? 'border-red-300 focus-visible:ring-red-500' : ''
                        }`}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Variables disponibles: <code className="bg-muted px-1 rounded">{'{nombre_cliente}'}</code>,{' '}
                          <code className="bg-muted px-1 rounded">{'{monto}'}</code>,{' '}
                          <code className="bg-muted px-1 rounded">{'{fecha_vencimiento}'}</code>
                        </p>
                        <span className={`text-xs ${isCharLimitExceeded ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                          {charCount.toLocaleString()} / {charLimit.toLocaleString()} caracteres
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/30 min-h-[200px]">
                      {channel === 'EMAIL' && subject && (
                        <div className="mb-4 pb-4 border-b">
                          <p className="text-xs text-muted-foreground mb-1">Asunto:</p>
                          <p className="font-semibold">{subject}</p>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm">
                        {messageWithSummary
                          ? messageWithSummary
                          : <span className="text-muted-foreground italic">Escribe un mensaje para ver la vista previa...</span>}
                      </div>
                      {message && (
                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                          <p>Este mensaje se enviará a {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="include-invoice-summary"
                      checked={includeInvoiceSummary}
                      onCheckedChange={(checked) => setIncludeInvoiceSummary(Boolean(checked))}
                    />
                    <Label htmlFor="include-invoice-summary" className="text-sm font-normal">
                      Incluir detalle de facturas seleccionadas al final del mensaje
                    </Label>
                  </div>
                  {invoiceSummaryText && (
                    <Alert className="bg-muted/40 border-dashed">
                      <AlertTitle className="text-sm font-semibold">Detalle que se agregará</AlertTitle>
                      <AlertDescription className="whitespace-pre-wrap text-xs">
                        {invoiceSummaryText.trim()}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                {/* Botón de envío */}
                <Button
                  onClick={handleSend}
                  disabled={!canSend || sendBatchMutation.isPending || isCharLimitExceeded}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                  size="lg"
                >
                  {sendBatchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando mensajes...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar a {selectedCustomers.size || 0} cliente{selectedCustomers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {/* Validaciones visuales */}
                {selectedCustomers.size === 0 && (
                  <Alert variant="default" className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Selecciona al menos un cliente para enviar el mensaje
                    </AlertDescription>
                  </Alert>
                )}

                {selectedCustomers.size > 0 && !messageWithSummary.trim() && (
                  <Alert variant="default" className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Escribe un mensaje antes de enviar
                    </AlertDescription>
                  </Alert>
                )}

                {channel === 'EMAIL' && selectedCustomers.size > 0 && !subject.trim() && (
                  <Alert variant="default" className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      El asunto es obligatorio para emails
                    </AlertDescription>
                  </Alert>
                )}

                {isCharLimitExceeded && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      El mensaje excede el límite de {charLimit.toLocaleString()} caracteres. Por favor, acórtalo.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Estados de éxito/error */}
                {sendBatchMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error al enviar</AlertTitle>
                    <AlertDescription>
                      {(sendBatchMutation.error as any)?.response?.data?.error || 'Error al enviar mensajes. Intenta nuevamente.'}
                    </AlertDescription>
                  </Alert>
                )}

                {sendBatchMutation.isSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">¡Mensajes en cola!</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <div className="space-y-1">
                        <p>
                          <strong>{sendBatchMutation.data.totalMessages}</strong> mensaje{sendBatchMutation.data.totalMessages !== 1 ? 's' : ''} se están enviando uno por uno.
                        </p>
                        <p className="text-xs">
                          Puedes ver el progreso en el dashboard. Los mensajes aparecerán en el timeline de facturas.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Card de información */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Información útil
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                  <p>
                    Los mensajes se envían <strong>uno por uno</strong> con rate limiting para no saturar los servicios
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                  <p>
                    Solo se muestran clientes que tienen {channel === 'EMAIL' ? 'email' : 'teléfono'} configurado
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                  <p>
                    Los mensajes se procesan en segundo plano y aparecerán en el timeline de facturas
                  </p>
                </div>
                {channel === 'WHATSAPP' && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                    <p>
                      WhatsApp tiene un límite de <strong>4096 caracteres</strong> por mensaje
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

interface CustomerInvoicesProps {
  customerId: string;
  selectedInvoices: string[];
  onToggleInvoice: (invoiceId: string) => void;
  onInvoicesLoaded: (customerId: string, invoices: InvoiceSummary[]) => void;
}

function CustomerInvoices({
  customerId,
  selectedInvoices,
  onToggleInvoice,
  onInvoicesLoaded,
}: CustomerInvoicesProps) {
  const { data, isLoading } = useQuery<{ invoices: InvoiceSummary[] }>({
    queryKey: ['customerInvoices', customerId],
    queryFn: async () => {
      const response = await api.get('/v1/invoices', {
        params: { customer_id: customerId },
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data?.invoices) {
      onInvoicesLoaded(
        customerId,
        data.invoices.filter((inv) => inv.estado !== 'SALDADA')
      );
    }
  }, [customerId, data, onInvoicesLoaded]);

  const pendingInvoices = (data?.invoices || []).filter((inv) => inv.estado !== 'SALDADA');

  return (
    <div className="ml-6 border-l pl-4 pb-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Facturas pendientes</p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Cargando facturas...
        </div>
      ) : pendingInvoices.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay facturas pendientes.</p>
      ) : (
        <div className="space-y-2">
          {pendingInvoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between text-xs">
              <div>
                <div className="font-medium">#{invoice.numero}</div>
                <div className="text-muted-foreground">
                  {formatCurrency(invoice.monto)} · vence {formatDate(invoice.fechaVto)}
                </div>
              </div>
              <Checkbox
                checked={selectedInvoices.includes(invoice.id)}
                onCheckedChange={() => onToggleInvoice(invoice.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildInvoiceSummaryText({
  includeInvoiceSummary,
  selectedCustomers,
  selectedInvoices,
  invoicesByCustomer,
}: {
  includeInvoiceSummary: boolean;
  selectedCustomers: Set<string>;
  selectedInvoices: Record<string, string[]>;
  invoicesByCustomer: Record<string, InvoiceSummary[]>;
}) {
  if (!includeInvoiceSummary) return '';

  const lines: string[] = [];

  Array.from(selectedCustomers).forEach((customerId) => {
    const invoices = invoicesByCustomer[customerId] || [];
    const selected = new Set(selectedInvoices[customerId] || []);

    invoices
      .filter((inv) => selected.has(inv.id))
      .forEach((inv) => {
        lines.push(
          `• Factura #${inv.numero} – ${formatCurrency(inv.monto)} – vence ${formatDate(inv.fechaVto)}`
        );
      });
  });

  if (lines.length === 0) return '';

  return `\n\nDetalle de facturas pendientes:\n${lines.join('\n')}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function buildInvoiceIdsPayload(
  selectedCustomers: Set<string>,
  selectedInvoices: Record<string, string[]>
): Record<string, string[]> {
  const payload: Record<string, string[]> = {};

  selectedCustomers.forEach((customerId) => {
    const invoices = selectedInvoices[customerId];
    if (invoices && invoices.length > 0) {
      payload[customerId] = invoices;
    }
  });

  return payload;
}

