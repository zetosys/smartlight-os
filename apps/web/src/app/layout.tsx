import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '../components/layout/AppShell';

export const metadata: Metadata = {
  title: 'SmartLight OS — Hardware-Agnostic SLMCS',
  description: 'Enterprise Street Light Management & Control System with Simulated IoT Communication Layer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
