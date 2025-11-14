'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Bell,
  LogOut,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Cobranzas', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Facturas', href: '/invoices', icon: FileText },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Cheques', href: '#', icon: CreditCard },
  { name: 'Eventos', href: '#', icon: Bell },
  { name: 'Notificaciones', href: '#', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-100 border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Constanza</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-gray-200" />

      {/* User Profile */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gray-200 text-gray-700">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Juan Pérez</p>
            <p className="text-xs text-gray-500 truncate">Analista de Cobranzas</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-2 w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Salir
        </Button>
      </div>
    </div>
  );
}
