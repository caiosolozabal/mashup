
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Users, DollarSign, FileText, ListMusic, Settings } from 'lucide-react';
import type { UserRole } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; 
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/events', label: 'Eventos', icon: CalendarDays },
  { href: '/schedule', label: 'Agenda', icon: ListMusic },
  { 
    href: '/payments', 
    label: 'Pagamentos', 
    icon: DollarSign,
    roles: ['admin', 'partner', 'dj', 'finance'] 
  },
  { 
    href: '/documents', 
    label: 'Documentos', 
    icon: FileText,
    roles: ['admin', 'partner', 'manager', 'producer']
  },
  { 
    href: '/guests', 
    label: 'Listas VIP', 
    icon: Users,
    roles: ['admin', 'partner', 'manager', 'producer']
  },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { role } = useAuth(); 

  const canView = (itemRoles?: UserRole[]) => {
    if (!itemRoles) return true; 
    if (!role) return false; 
    return itemRoles.includes(role);
  };

  return (
    <SidebarMenu>
      {navItems.filter(item => canView(item.roles)).map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: 'right', align: 'center' }}
              aria-label={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
