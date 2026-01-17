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
        <main className="min-h-screen flex items-center justify-center p-5">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
