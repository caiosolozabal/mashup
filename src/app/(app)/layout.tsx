import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'; // Assuming sidebar is correctly exported
import Header from '@/components/layout/Header';
import SidebarNav from '@/components/layout/SidebarNav';
import Logo from '@/components/shared/Logo';
import UserNav from '@/components/layout/UserNav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Sidebar side="left" variant="sidebar" collapsible="icon">
          <SidebarHeader className="p-4 flex items-center justify-between">
             <div className="block group-data-[collapsible=icon]:hidden">
                <Logo />
             </div>
             <div className="hidden group-data-[collapsible=icon]:block ml-[-0.25rem]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><path d="M9 18a5 5 0 0 0-5 1.58A5 5 0 0 0 9 21.17V18Z"/><path d="M12 16a5 5 0 0 0-5 1.58A5 5 0 0 0 12 21.17V16Z"/></svg>
             </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              © {new Date().getFullYear()} Mashup Music
            </p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
           <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
