
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, DollarSign, Settings, ListMusic } from 'lucide-react';
import type { UserRole } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; 
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['admin', 'partner', 'dj'] },
  { href: '/events', label: 'Eventos', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/schedule', label: 'Agenda', icon: ListMusic, roles: ['admin', 'partner', 'dj'] },
  { 
    href: '/payments', 
    label: 'Pagamentos', 
    icon: DollarSign,
    roles: ['admin', 'partner', 'dj'] 
  },
  // Documentos and Listas VIP are deferred for now based on core focus.
  // { 
  //   href: '/documents', 
  //   label: 'Documentos', 
  //   icon: FileText,
  //   roles: ['admin', 'partner'] // DJs might view event-specific docs
  // },
  // { 
  //   href: '/guests', 
  //   label: 'Listas VIP', 
  //   icon: Users,
  //   roles: ['admin', 'partner'] // Or specific roles like manager/producer if added
  // },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin', 'partner', 'dj'] },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { role, loading } = useAuth(); 

  const canView = (itemRoles?: UserRole[]) => {
    if (!itemRoles || itemRoles.length === 0) return true; // Public or always visible if no roles specified
    if (loading || !role) return false; // Don't show role-specific items if loading or no role
    return itemRoles.includes(role);
  };

  if (loading) {
    // Optionally, show a skeleton or loading state for the nav
    return (
       <SidebarMenu>
        {[...Array(4)].map((_, i) => (
          <SidebarMenuItem key={i} >
            <SidebarMenuButton disabled className="h-8 w-full opacity-50">
              <span className="w-4 h-4 bg-muted rounded-sm animate-pulse"></span>
              <span className="w-20 h-4 bg-muted rounded-sm animate-pulse"></span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      {navItems.filter(item => canView(item.roles)).map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              as="a" // Ensure it behaves like an anchor for NextLink
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
