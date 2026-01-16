'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type CgmReading = {
    Glucose: number;
    Status: 'low' | 'ok' | 'high';
    Trend:
      | 'rising quickly'
      | 'rising'
      | 'steady'
      | 'falling'
      | 'falling quickly'
      | 'rising slightly'
      | 'falling slightly';
    Time: string;
};

const TREND_ARROWS: Record<CgmReading['Trend'], string> = {
    'rising quickly': '↑',
    rising: '↗',
    'rising slightly': '→',
    steady: '→',
    'falling slightly': '→',
    falling: '↘',
    'falling quickly': '↓',
};

function calculateTimeSince(timeString: string | null) {
    if (!timeString) return '--';
    const readingTime = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - readingTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
}


export default function DashboardPage() {
    const pathname = usePathname();
    const [data, setData] = useState<CgmReading | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [timeSince, setTimeSince] = useState('--');

    const fetchGlucose = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/cgm');
            if (!response.ok) {
                throw new Error('Failed to fetch glucose data');
            }
            const result: CgmReading = await response.json();
            setData(result);
            setLastSync(new Date());
        } catch (err) {
            setError('Unable to retrieve glucose data. Please try again.');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGlucose();
        const fetchInterval = setInterval(fetchGlucose, 5 * 60 * 1000); // every 5 minutes
        return () => clearInterval(fetchInterval);
    }, [fetchGlucose]);

    useEffect(() => {
        const updateInterval = setInterval(() => {
            if (data?.Time) {
                setTimeSince(calculateTimeSince(data.Time));
            }
        }, 60000); // every minute
        return () => clearInterval(updateInterval);
    }, [data]);

    useEffect(() => {
        if(data?.Time) {
            setTimeSince(calculateTimeSince(data.Time));
        }
    }, [data?.Time]);

    const getStatusClasses = (status?: CgmReading['Status']) => {
        if (!status) return { ring: 'border-primary', badge: 'bg-muted', text: 'text-primary' };
        switch (status) {
            case 'low': return { ring: 'border-destructive', badge: 'bg-destructive/10 border-destructive text-destructive', dot: 'bg-destructive', shadow: 'shadow-destructive/30' };
            case 'high': return { ring: 'border-accent', badge: 'bg-accent/10 border-accent text-accent', dot: 'bg-accent', shadow: 'shadow-accent/30' };
            case 'ok':
            default: return { ring: 'border-success', badge: 'bg-success/10 border-success text-success', dot: 'bg-success', shadow: 'shadow-success/30' };
        }
    };

    const statusClasses = getStatusClasses(data?.Status);
    
    const getStatusColorVariable = (status?: CgmReading['Status']) => {
        switch (status) {
            case 'low': return 'destructive';
            case 'high': return 'accent';
            case 'ok': return 'success';
            default: return 'primary';
        }
    }
    const statusColorVar = getStatusColorVariable(data?.Status);


    return (
        <div className="w-full max-w-[380px] relative z-10 font-headline">
            <header className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-[3px]" style={{ textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))'}}>
                    DEXCOM G7
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-[2px] opacity-70">
                    CGM SYSTEM
                </p>
            </header>

            <nav className="flex gap-3 mb-8 bg-slate-900/80 p-1.5 rounded-xl border-2 border-primary shadow-[0_0_20px_theme('colors.primary/30%'),_inset_0_0_20px_theme('colors.primary/10%')]">
                <Link href="/dashboard" className={cn("flex-1 p-3 rounded-lg text-sm font-bold text-primary text-center uppercase tracking-wider transition-all hover:bg-primary/10 hover:shadow-[0_0_15px_theme('colors.primary/50%')]", { 'bg-primary/20 shadow-[0_0_20px_theme(\'colors.primary/60%\'),_inset_0_0_10px_theme(\'colors.primary/30%\')]': pathname.startsWith('/dashboard') })}>
                    Monitor
                </Link>
                <Link href="/log" className={cn("flex-1 p-3 rounded-lg text-sm font-bold text-primary text-center uppercase tracking-wider transition-all hover:bg-primary/10 hover:shadow-[0_0_15px_theme('colors.primary/50%')]", { 'bg-primary/20 shadow-[0_0_20px_theme(\'colors.primary/60%\'),_inset_0_0_10px_theme(\'colors.primary/30%\')]': pathname.startsWith('/log') })}>
                    Log
                </Link>
            </nav>

            {error && (
                <div className="bg-destructive/10 border-2 border-destructive text-destructive p-3.5 rounded-xl mb-5 text-center text-xs font-semibold shadow-[0_0_20px_theme('colors.destructive/30%')]">
                    {error}
                </div>
            )}

            <div className="relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] mx-auto mb-10 max-w-full">
                <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_30%,_theme('colors.slate.900/90%'),_#0a0e27)] border-2 border-primary flex items-center justify-center relative animate-pulse-border">
                    <div className={cn("absolute -top-px -left-px w-[calc(100%+4px)] h-[calc(100%+4px)] rounded-full border-2 border-transparent animate-rotate", statusClasses.ring)} style={{borderTopColor: `hsl(var(--${statusColorVar}))`, borderRightColor: `hsl(var(--${statusColorVar}))`, boxShadow: `0 0 30px hsl(var(--${statusColorVar}) / 0.6)`}} />
                    <div className="w-[85%] h-[85%] rounded-full bg-background/80 flex flex-col items-center justify-center border-2 border-primary/30 shadow-[inset_0_0_20px_theme('colors.primary/20%')]">
                        <div className="text-6xl sm:text-7xl font-black text-primary leading-none mb-1" style={{ textShadow: '0 0 15px hsl(var(--primary)), 0 0 25px hsl(var(--primary))' }}>
                            {loading ? '--' : data?.Glucose}
                        </div>
                        <div className="text-base font-bold text-primary/70 tracking-[2px]">
                            mg/dL
                        </div>
                    </div>
                    <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 bg-background/90 border-2 border-primary rounded-full flex items-center justify-center text-xl sm:text-2xl text-primary shadow-[0_0_20px_theme('colors.primary/50%'),_inset_0_0_10px_theme('colors.primary/20%')]">
                        {data?.Trend ? TREND_ARROWS[data.Trend] : '→'}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/80 rounded-2xl p-6 mb-5 border-2 border-primary shadow-[0_0_20px_theme('colors.primary/30%'),_inset_0_0_20px_theme('colors.primary/5%')]">
                 <div className="flex justify-between items-center py-3 border-b border-primary/20">
                    <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Status</span>
                    <div className={cn('inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border', statusClasses.badge)} style={{boxShadow: `0 0 15px hsl(var(--${statusColorVar}) / 0.4)`}}>
                        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse-dot', statusClasses.dot)} style={{boxShadow: `0 0 10px hsl(var(--${statusColorVar}))`}}/>
                        <span>{loading ? 'Loading' : data?.Status || '--'}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-primary/20">
                    <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Trend</span>
                    <span className="text-sm font-bold text-primary drop-shadow-[0_0_10px_theme('colors.primary/50%')] capitalize">{loading ? '--' : data?.Trend}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-primary/20">
                    <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Last Reading</span>
                    <span className="text-sm font-bold text-primary drop-shadow-[0_0_10px_theme('colors.primary/50%')]">{data?.Time ? new Date(data.Time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                </div>
                <div className="flex justify-between items-center pt-3">
                    <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Time Since</span>
                    <span className="text-sm font-bold text-primary drop-shadow-[0_0_10px_theme('colors.primary/50%')]">{loading ? '--' : timeSince}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-slate-900/80 rounded-xl p-5 text-center border-2 border-destructive shadow-[0_0_20px_theme('colors.destructive/30%'),_inset_0_0_20px_theme('colors.destructive/10%')]">
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-destructive">Low Alert</div>
                    <div className="text-2xl sm:text-3xl font-black text-destructive" style={{textShadow: '0 0 20px hsl(var(--destructive))'}}>60</div>
                </div>
                 <div className="bg-slate-900/80 rounded-xl p-5 text-center border-2 border-accent shadow-[0_0_20px_theme('colors.accent/30%'),_inset_0_0_20px_theme('colors.accent/10%')]">
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-accent">High Alert</div>
                    <div className="text-2xl sm:text-3xl font-black text-accent" style={{textShadow: '0 0 20px hsl(var(--accent))'}}>250</div>
                </div>
            </div>

            <button onClick={fetchGlucose} disabled={loading} className="w-full p-4 bg-slate-900/80 border-2 border-primary rounded-xl text-sm font-bold text-primary uppercase tracking-[2px] shadow-[0_0_20px_theme('colors.primary/30%')] transition-all hover:bg-primary/10 hover:shadow-[0_0_30px_theme('colors.primary/60%'),_inset_0_0_20px_theme('colors.primary/20%')] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none">
                {loading ? 'Updating...' : 'Refresh Data'}
            </button>
            <div className="text-center mt-5 text-xs text-primary/60 font-medium tracking-wider">
                Last updated: {lastSync ? lastSync.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
            </div>
        </div>
    );
}
