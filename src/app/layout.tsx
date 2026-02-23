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
        <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden p-3 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.10),transparent_40%),radial-gradient(circle_at_80%_90%,hsl(var(--warning)/0.10),transparent_45%)]" />
          <div className="relative w-full max-w-[430px]">
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-2 shadow-[0_40px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="iphone-app-shell relative min-h-[calc(100dvh-1.5rem)] max-h-[900px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-background">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
                  <div className="h-1.5 w-24 rounded-full bg-white/20" />
                </div>
                <div className="h-full overflow-y-auto px-3 pb-4 pt-8 sm:px-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
