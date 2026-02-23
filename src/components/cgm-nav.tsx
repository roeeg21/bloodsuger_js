'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Monitor' },
  { href: '/graph', label: 'Graph' },
  { href: '/log', label: 'Log' },
];

export function CgmNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'flex gap-1 rounded-full border border-white/10 bg-white/6 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_22px_rgba(0,0,0,0.22)] backdrop-blur-xl',
        className
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold tracking-tight transition-all duration-200 active:scale-[0.98]',
              active
                ? 'border border-white/15 bg-white/16 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_rgba(0,0,0,0.24)]'
                : 'text-muted-foreground hover:bg-white/7 hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
