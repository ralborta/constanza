'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getEffectivePerfil } from '@/lib/auth';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Pencil, UserPlus, Building2 } from 'lucide-react';

type Perfil = 'ADM' | 'OPERADOR_1' | 'OPERADOR_2';

interface OrgUser {
  id: string;
  tenantId: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  email: string;
  nombre: string;
  apellido: string;
  codigoUnico: string;
  perfil: string;
  activo: boolean;
  createdAt: string;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

const perfilLabel: Record<string, string> = {
  ADM: 'Administrador',
  OPERADOR_1: 'Operador 1',
  OPERADOR_2: 'Operador 2',
};

const emptyCreate = {
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  codigoUnico: '',
  perfil: 'OPERADOR_1' as Perfil,
  /** vacío = misma empresa que la sesión */
  tenantId: '' as string,
};

export default function SettingsUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState({
    email: '',
    nombre: '',
    apellido: '',
    codigoUnico: '',
    perfil: 'OPERADOR_1' as Perfil,
    activo: true,
    password: '',
    tenantId: '',
  });

  useEffect(() => {
    if (getEffectivePerfil() !== 'ADM') {
      router.replace('/dashboard');
    }
  }, [router]);

  const { data, isLoading, isError, error } = useQuery<{ users: OrgUser[] }>({
    queryKey: ['org-users'],
    queryFn: async () => {
      const r = await api.get('/v1/users');
      return r.data;
    },
    enabled: getEffectivePerfil() === 'ADM',
  });

  const { data: tenantsData } = useQuery<{ tenants: TenantOption[] }>({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const r = await api.get('/v1/tenants');
      return r.data;
    },
    enabled: getEffectivePerfil() === 'ADM',
  });

  const { data: me } = useQuery<{
    tenantId: string;
    tenantName: string | null;
    tenantSlug: string | null;
  }>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const r = await api.get('/auth/me');
      return r.data;
    },
    enabled: getEffectivePerfil() === 'ADM',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        nombre: createForm.nombre.trim(),
        apellido: createForm.apellido.trim(),
        codigoUnico: createForm.codigoUnico.trim(),
        perfil: createForm.perfil,
      };
      if (createForm.tenantId.trim()) {
        payload.tenantId = createForm.tenantId.trim();
      }
      await api.post('/v1/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      setCreateOpen(false);
      setCreateForm(emptyCreate);
    },
  });

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const body: Record<string, unknown> = {
        email: editForm.email.trim().toLowerCase(),
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        codigoUnico: editForm.codigoUnico.trim(),
        perfil: editForm.perfil,
        activo: editForm.activo,
        tenantId: editForm.tenantId,
      };
      if (editForm.password.trim().length >= 6) {
        body.password = editForm.password.trim();
      }
      await api.patch(`/v1/users/${editUser.id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setEditUser(null);
      setEditForm((f) => ({ ...f, password: '' }));
    },
  });

  const openEdit = (u: OrgUser) => {
    setEditUser(u);
    setEditForm({
      email: u.email,
      nombre: u.nombre,
      apellido: u.apellido,
      codigoUnico: u.codigoUnico,
      perfil: u.perfil as Perfil,
      activo: u.activo,
      password: '',
      tenantId: u.tenantId,
    });
  };

  if (getEffectivePerfil() !== 'ADM') {
    return (
      <MainLayout>
        <div className="p-8 text-sm text-muted-foreground">Redirigiendo…</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-sm text-gray-600">
              Cada usuario pertenece a una <strong>empresa</strong> en el sistema: ahí verá facturas, clientes e
              ingresos (Cresium). Podés asignar o cambiar la empresa abajo.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {(error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              'No se pudo cargar la lista. Si no sos administrador, esta sección no está disponible.'}
          </div>
        )}

        {me && (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertTitle>Tu sesión ahora</AlertTitle>
            <AlertDescription className="text-sm space-y-1">
              <p>
                <span className="font-medium">{me.tenantName ?? 'Empresa'}</span>
                {me.tenantSlug ? (
                  <span className="text-muted-foreground"> ({me.tenantSlug})</span>
                ) : null}
              </p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                ID empresa (tenant): {me.tenantId}
              </p>
              <p className="text-xs pt-1">
                Los pagos Cresium deben guardarse con el mismo ID en Railway (<code className="rounded bg-muted px-1">CRESIUM_TENANT_ID</code>).
                Si cambiás de empresa a un usuario, que cierre sesión y vuelva a entrar.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.users ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.nombre} {u.apellido}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="font-mono text-sm">{u.codigoUnico}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm font-medium line-clamp-2">
                          {u.tenantName ?? '—'}
                        </span>
                        <span className="block font-mono text-[10px] text-muted-foreground truncate" title={u.tenantId}>
                          {u.tenantId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{perfilLabel[u.perfil] ?? u.perfil}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.activo ? (
                          <span className="text-green-700 text-sm">Activo</span>
                        ) : (
                          <span className="text-gray-500 text-sm">Inactivo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="gap-1">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && (data?.users?.length ?? 0) === 0 && !isError && (
              <p className="text-center text-sm text-gray-500 py-8">No hay usuarios cargados.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
              <DialogDescription>
                Elegí la empresa donde verá datos; si no, se usa la de tu sesión actual.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label>Empresa</Label>
                <Select
                  value={createForm.tenantId || '__session__'}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, tenantId: v === '__session__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__session__">Misma que tu sesión actual</SelectItem>
                    {(tenantsData?.tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-email">Email</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-pass">Contraseña</Label>
                <Input
                  id="c-pass"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-nom">Nombre</Label>
                  <Input
                    id="c-nom"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-ape">Apellido</Label>
                  <Input
                    id="c-ape"
                    value={createForm.apellido}
                    onChange={(e) => setCreateForm((f) => ({ ...f, apellido: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-cod">Código único</Label>
                <Input
                  id="c-cod"
                  value={createForm.codigoUnico}
                  onChange={(e) => setCreateForm((f) => ({ ...f, codigoUnico: e.target.value }))}
                  placeholder="ej. OP-002"
                />
              </div>
              <div className="grid gap-2">
                <Label>Perfil</Label>
                <Select
                  value={createForm.perfil}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, perfil: v as Perfil }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADM">Administrador</SelectItem>
                    <SelectItem value="OPERADOR_1">Operador 1</SelectItem>
                    <SelectItem value="OPERADOR_2">Operador 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data
                  ?.error ?? 'Error al crear'}
              </p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Incluye la empresa (tenant): define qué facturas e ingresos ve este usuario.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label>Empresa (tenant)</Label>
                <Select
                  value={editForm.tenantId}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, tenantId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tenantsData?.tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Elegí la misma empresa donde están los pagos Cresium (ej. la que coincide con{' '}
                  <code className="rounded bg-muted px-0.5">CRESIUM_TENANT_ID</code> en Railway).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-email">Email</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-pass">Nueva contraseña (opcional)</Label>
                <Input
                  id="e-pass"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres si cambiás"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="e-nom">Nombre</Label>
                  <Input
                    id="e-nom"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-ape">Apellido</Label>
                  <Input
                    id="e-ape"
                    value={editForm.apellido}
                    onChange={(e) => setEditForm((f) => ({ ...f, apellido: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-cod">Código único</Label>
                <Input
                  id="e-cod"
                  value={editForm.codigoUnico}
                  onChange={(e) => setEditForm((f) => ({ ...f, codigoUnico: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Perfil</Label>
                <Select
                  value={editForm.perfil}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, perfil: v as Perfil }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADM">Administrador</SelectItem>
                    <SelectItem value="OPERADOR_1">Operador 1</SelectItem>
                    <SelectItem value="OPERADOR_2">Operador 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  id="e-act"
                  checked={editForm.activo}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, activo: v === true }))}
                />
                <Label htmlFor="e-act" className="cursor-pointer font-normal">
                  Usuario activo
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>
                Cancelar
              </Button>
              <Button disabled={patchMutation.isPending} onClick={() => patchMutation.mutate()}>
                {patchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
            {patchMutation.isError && (
              <p className="text-sm text-red-600">
                {(patchMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  'Error al guardar'}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
