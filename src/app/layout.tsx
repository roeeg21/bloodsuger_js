import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import './globals.css';
import { Rajdhani } from 'next/font/google';

const rajdhani = Rajdhani({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans' 
});

export const metadata: Metadata = {
  title: 'CyberHealth Monitor',
  description: 'Track and compare your blood sugar levels.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn('min-h-screen bg-background font-sans antialiased', rajdhani.variable)}>
        <main className="relative flex min-h-[100dvh] w-full justify-center overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.08),transparent_40%),radial-gradient(circle_at_80%_90%,hsl(var(--warning)/0.08),transparent_45%)]" />
          <div className="relative w-full max-w-[430px] px-3 pb-4 pt-4 sm:px-4 sm:pt-6">
            <div className="h-full min-h-[100dvh]">
              {children}
            </div>
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
