'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';

export function CreateInvoiceManualButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [numero, setNumero] = useState('');
  const [montoPesos, setMontoPesos] = useState('');
  const [fechaVto, setFechaVto] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [estado, setEstado] = useState<string>('ABIERTA');

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const r = await api.get<{ customers: Array<{ id: string; razonSocial: string; codigoUnico: string }> }>(
        '/v1/customers'
      );
      return r.data.customers;
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
          const m = parseFloat(montoPesos.replace(',', '.'));
          if (!customerId || !numero.trim() || !fechaVto.trim() || !Number.isFinite(m) || m <= 0) {
            throw new Error('Completá cliente, número, fecha y monto válido');
          }
      const r = await api.post('/v1/invoices', {
        customerId,
        numero: numero.trim(),
        montoPesos: m,
        fechaVto: fechaVto.trim(),
        estado,
        externalRef: externalRef.trim() || undefined,
      });
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setOpen(false);
      setNumero('');
      setMontoPesos('');
      setFechaVto('');
      setExternalRef('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
          <Plus className="mr-2 h-4 w-4" />
          Nueva factura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alta manual de factura</DialogTitle>
          <DialogDescription>
            Crear una factura en Constanza. El monto es en pesos (se guarda en centavos). Para cargas masivas
            usá Excel o la API{' '}
            <code className="text-xs bg-muted px-1 rounded">POST /v1/integrations/ingest</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customersData?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    CVU {c.codigoUnico} — {c.razonSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Número de factura</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="FAC-2026-001" />
          </div>
          <div className="space-y-1">
            <Label>Monto (pesos)</Label>
            <Input
              value={montoPesos}
              onChange={(e) => setMontoPesos(e.target.value)}
              placeholder="15000.50"
            />
          </div>
          <div className="space-y-1">
            <Label>Fecha vencimiento</Label>
            <Input
              value={fechaVto}
              onChange={(e) => setFechaVto(e.target.value)}
              placeholder="YYYY-MM-DD o DD/MM/YYYY"
            />
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABIERTA">ABIERTA</SelectItem>
                <SelectItem value="VENCIDA">VENCIDA</SelectItem>
                <SelectItem value="PARCIAL">PARCIAL</SelectItem>
                <SelectItem value="SALDADA">SALDADA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>ID en ERP (opcional)</Label>
            <Input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="sync / integración"
            />
          </div>

          {createMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(createMutation.error as Error).message ||
                  (createMutation.error as any)?.response?.data?.error ||
                  'Error al crear'}
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Guardando…' : 'Crear factura'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
