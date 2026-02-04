'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show header on admin pages
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {children}
      </main>
      <footer className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[var(--color-text-light)]">
            © 2026 Bán Nghé. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
