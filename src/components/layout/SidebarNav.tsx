'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Users, DollarSign, FileText, ListMusic, Settings } from 'lucide-react';
import type { UserRole } from '@/context/AuthContext'; // Assuming UserRole type is exported
import { useAuth } from '@/hooks/useAuth'; // To get user role

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // Roles that can see this item. Undefined means all authenticated users.
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/schedule', label: 'Schedule', icon: ListMusic },
  { 
    href: '/payments', 
    label: 'Payments', 
    icon: DollarSign,
    roles: ['admin', 'partner', 'dj', 'finance'] 
  },
  { 
    href: '/documents', 
    label: 'Documents', 
    icon: FileText,
    roles: ['admin', 'partner', 'manager', 'producer'] // Example
  },
  { 
    href: '/guests', 
    label: 'Guest Lists', 
    icon: Users,
    roles: ['admin', 'partner', 'manager', 'producer'] // Example
  },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { role } = useAuth(); // Get current user's role

  const canView = (itemRoles?: UserRole[]) => {
    if (!itemRoles) return true; // No specific roles defined, visible to all
    if (!role) return false; // User has no role, cannot see role-specific items
    return itemRoles.includes(role);
  };

  return (
    <SidebarMenu>
      {navItems.filter(item => canView(item.roles)).map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
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
