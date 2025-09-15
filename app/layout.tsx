import './globals.css';
import React from 'react';
import { ToastProvider } from '@/components/ui/use-toast';
import Link from 'next/link';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { DialectSelector } from '@/components/settings/DialectSelector';

export const metadata = {
  title: 'Romani Translation AI',
  description: 'AI-powered Swedish to Romani translation with expert-in-the-loop',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <SettingsProvider>
          <ToastProvider>
            <header className="border-b bg-white">
              <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                <Link href="/" className="font-semibold">Romani Translation AI</Link>
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <DialectSelector />
                  <Link href="/review" className="hover:underline">Review</Link>
                  <Link href="/ingest" className="hover:underline">Ingestion</Link>
                  <Link href="/export" className="hover:underline">Export</Link>
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
