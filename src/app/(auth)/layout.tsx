import type { ReactNode } from 'react';
import Logo from '@/components/shared/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="mb-8">
        <Logo />
      </div>
      <main className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
}
