'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Bell,
  LogOut,
  User,
  Users,
  Send,
  Phone,
  Upload,
  Play,
  List,
  ChevronDown,
  ChevronRight,
  Wallet,
  ArrowLeftRight,
  CheckCircle,
  BarChart3,
  CalendarClock,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Facturas', href: '/invoices', icon: FileText },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Cheques', href: '#', icon: CreditCard },
  { name: 'Eventos', href: '#', icon: Bell },
  { name: 'Jobs', href: '/jobs', icon: BarChart3 },
];

const notifySubmenu = [
  { name: 'Enviar Mensaje', href: '/notify', icon: Send },
  { name: 'Progreso de Mensajes', href: '/notify/batches', icon: BarChart3 },
];

const callsSubmenu = [
  { name: 'Cargar Batch', href: '/calls/upload', icon: Upload },
  { name: 'Ejecutar Batches', href: '/calls/batches', icon: Play },
  { name: 'Listado de Llamadas', href: '/calls', icon: List },
  { name: 'Cronograma de callbacks', href: '/calls/cronograma', icon: CalendarClock },
];

const paymentsSubmenu = [
  { name: 'Transferencias Bancarias', href: '/payments/transfers', icon: ArrowLeftRight },
  { name: 'Conciliación de Pagos', href: '/payments/reconciliation', icon: CheckCircle },
];

function NavItem({ href, icon: Icon, name, active }: { href: string; icon: any; name: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-sidebar-active text-white'
          : 'text-sidebar-fg/70 hover:bg-white/10 hover:text-sidebar-fg'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {name}
    </Link>
  );
}

function SubNavItem({ href, icon: Icon, name, active }: { href: string; icon: any; name: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors duration-150',
        active
          ? 'bg-sidebar-active text-white font-medium'
          : 'text-sidebar-fg/60 hover:bg-white/10 hover:text-sidebar-fg'
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {name}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-fg/40 select-none">
      {children}
    </p>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [notifyOpen, setNotifyOpen] = useState(pathname?.startsWith('/notify') || false);
  const [callsOpen, setCallsOpen] = useState(pathname?.startsWith('/calls') || false);
  const [paymentsOpen, setPaymentsOpen] = useState(pathname?.startsWith('/payments') || false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const isNotifyActive = pathname?.startsWith('/notify');
  const isCallsActive = pathname?.startsWith('/calls');
  const isPaymentsActive = pathname?.startsWith('/payments');

  return (
    <div className="flex h-screen w-60 flex-col bg-sidebar-bg border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-active">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-fg leading-none">Constanza</p>
          <p className="text-[10px] text-sidebar-fg/50 leading-none mt-0.5">Gestión de Cobranzas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <SectionLabel>Operaciones</SectionLabel>

        {navigation.map((item) => (
          <NavItem
            key={item.name}
            href={item.href}
            icon={item.icon}
            name={item.name}
            active={pathname === item.href || (item.href !== '#' && pathname?.startsWith(item.href + '/') || false)}
          />
        ))}

        <SectionLabel>Comunicaciones</SectionLabel>

        {/* Enviar Mensajes */}
        <Collapsible open={notifyOpen} onOpenChange={setNotifyOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              isNotifyActive
                ? 'bg-sidebar-active text-white'
                : 'text-sidebar-fg/70 hover:bg-white/10 hover:text-sidebar-fg'
            )}
          >
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 flex-shrink-0" />
              <span>Enviar Mensajes</span>
            </div>
            {notifyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
            {notifySubmenu.map((item) => (
              <SubNavItem key={item.name} href={item.href} icon={item.icon} name={item.name} active={pathname === item.href} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Llamadas */}
        <Collapsible open={callsOpen} onOpenChange={setCallsOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              isCallsActive
                ? 'bg-sidebar-active text-white'
                : 'text-sidebar-fg/70 hover:bg-white/10 hover:text-sidebar-fg'
            )}
          >
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>Llamadas</span>
            </div>
            {callsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
            {callsSubmenu.map((item) => (
              <SubNavItem key={item.name} href={item.href} icon={item.icon} name={item.name} active={pathname === item.href} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        <SectionLabel>Finanzas</SectionLabel>

        {/* Pagos */}
        <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              isPaymentsActive
                ? 'bg-sidebar-active text-white'
                : 'text-sidebar-fg/70 hover:bg-white/10 hover:text-sidebar-fg'
            )}
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 flex-shrink-0" />
              <span>Pagos</span>
            </div>
            {paymentsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
            {paymentsSubmenu.map((item) => (
              <SubNavItem key={item.name} href={item.href} icon={item.icon} name={item.name} active={pathname === item.href} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-active text-white text-xs font-semibold">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-fg truncate leading-none">Juan Pérez</p>
            <p className="text-[11px] text-sidebar-fg/50 truncate mt-0.5">Analista de Cobranzas</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-1.5 rounded-md text-sidebar-fg/40 hover:text-sidebar-fg hover:bg-white/10 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
