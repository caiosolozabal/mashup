'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserNav from '@/components/layout/UserNav';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header() {
  const isMobile = useIsMobile();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      {/* Optional: Breadcrumbs or Page Title can go here */}
      <div className="ml-auto flex items-center gap-4">
        {/* Add any other header items like notifications here */}
        <UserNav />
      </div>
    </header>
  );
}
