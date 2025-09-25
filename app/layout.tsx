import './globals.css';
import React from 'react';
import { ToastProvider } from '@/components/ui/use-toast';
import Link from 'next/link';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { DialectSelector } from '@/components/settings/DialectSelector';

export const metadata = {
  title: 'AI system för romska',
  description: 'AI-drivet översättning från svenska till romani med expertgranskning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SettingsProvider>
          <ToastProvider>
            <header className="border-b bg-white">
              <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                <Link href="/" className="font-semibold">AI system för romska</Link>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <DialectSelector />
                  <Link href="/review" className="hover:underline">Granska</Link>
                  <Link href="/ingest" className="hover:underline">Inmatning</Link>
                  <Link href="/export" className="hover:underline">Exportera</Link>
                </div>
              </nav>
            </header>
            <main>{children}</main>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
