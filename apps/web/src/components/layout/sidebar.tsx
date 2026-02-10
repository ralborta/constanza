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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const navigation = [
  { name: 'Cobranzas', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
  { name: 'Facturas', href: '/invoices', icon: FileText, color: 'purple' },
  { name: 'Clientes', href: '/customers', icon: Users, color: 'indigo' },
  { name: 'Cheques', href: '#', icon: CreditCard, color: 'yellow' },
  { name: 'Eventos', href: '#', icon: Bell, color: 'orange' },
  { name: 'Jobs', href: '/jobs', icon: BarChart3, color: 'green' },
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

export function Sidebar() {
  const pathname = usePathname();
  const [notifyOpen, setNotifyOpen] = useState(
    pathname?.startsWith('/notify') || false
  );
  const [callsOpen, setCallsOpen] = useState(
    pathname?.startsWith('/calls') || false
  );
  const [paymentsOpen, setPaymentsOpen] = useState(
    pathname?.startsWith('/payments') || false
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const isNotifyActive = pathname?.startsWith('/notify');
  const isCallsActive = pathname?.startsWith('/calls');
  const isPaymentsActive = pathname?.startsWith('/payments');

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-xl">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-700 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <h1 className="text-xl font-bold text-white drop-shadow-lg">Constanza</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const colorClasses = {
            blue: isActive
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'text-blue-300 hover:bg-blue-500/20 hover:text-blue-200',
            purple: isActive
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50'
              : 'text-purple-300 hover:bg-purple-500/20 hover:text-purple-200',
            indigo: isActive
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/50'
              : 'text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200',
            green: isActive
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50'
              : 'text-green-300 hover:bg-green-500/20 hover:text-green-200',
            yellow: isActive
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/50'
              : 'text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200',
            orange: isActive
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50'
              : 'text-orange-300 hover:bg-orange-500/20 hover:text-orange-200',
          };
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                colorClasses[item.color as keyof typeof colorClasses]
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Menú desplegable de Enviar Mensajes */}
        <Collapsible open={notifyOpen} onOpenChange={setNotifyOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isNotifyActive
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'text-green-300 hover:bg-green-500/20 hover:text-green-200'
            )}
          >
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5" />
              <span>Enviar Mensajes</span>
            </div>
            {notifyOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-2 space-y-1.5">
            {notifySubmenu.map((item, index) => {
              const isActive = pathname === item.href;
              const submenuColors = [
                { active: 'bg-gradient-to-r from-green-400 to-green-500', inactive: 'text-green-300 hover:bg-green-500/20' },
                { active: 'bg-gradient-to-r from-emerald-400 to-emerald-500', inactive: 'text-emerald-300 hover:bg-emerald-500/20' },
              ];
              const colors = submenuColors[index % submenuColors.length];
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                    isActive
                      ? `${colors.active} text-white shadow-md`
                      : `${colors.inactive} hover:text-white`
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Menú desplegable de Llamadas */}
        <Collapsible open={callsOpen} onOpenChange={setCallsOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isCallsActive
                ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/50'
                : 'text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200'
            )}
          >
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5" />
              <span>Llamadas</span>
            </div>
            {callsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-2 space-y-1.5">
            {callsSubmenu.map((item, index) => {
              const isActive = pathname === item.href;
              const submenuColors = [
                { active: 'bg-gradient-to-r from-cyan-400 to-cyan-500', inactive: 'text-cyan-300 hover:bg-cyan-500/20' },
                { active: 'bg-gradient-to-r from-teal-400 to-teal-500', inactive: 'text-teal-300 hover:bg-teal-500/20' },
                { active: 'bg-gradient-to-r from-emerald-400 to-emerald-500', inactive: 'text-emerald-300 hover:bg-emerald-500/20' },
              ];
              const colors = submenuColors[index % submenuColors.length];
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                    isActive
                      ? `${colors.active} text-white shadow-md`
                      : `${colors.inactive} hover:text-white`
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Menú desplegable de Pagos */}
        <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
          <CollapsibleTrigger
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isPaymentsActive
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/50'
                : 'text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200'
            )}
          >
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5" />
              <span>Pagos</span>
            </div>
            {paymentsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-2 space-y-1.5">
            {paymentsSubmenu.map((item, index) => {
              const isActive = pathname === item.href;
              const submenuColors = [
                { active: 'bg-gradient-to-r from-emerald-400 to-emerald-500', inactive: 'text-emerald-300 hover:bg-emerald-500/20' },
                { active: 'bg-gradient-to-r from-teal-400 to-teal-500', inactive: 'text-teal-300 hover:bg-teal-500/20' },
              ];
              const colors = submenuColors[index % submenuColors.length];
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                    isActive
                      ? `${colors.active} text-white shadow-md`
                      : `${colors.inactive} hover:text-white`
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      <Separator className="bg-slate-700" />

      {/* User Profile */}
      <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-t border-slate-700">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
          <Avatar className="h-10 w-10 ring-2 ring-blue-400/50">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Juan Pérez</p>
            <p className="text-xs text-slate-300 truncate">Analista de Cobranzas</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-2 w-full justify-start text-slate-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Salir
        </Button>
      </div>
    </div>
  );
}
