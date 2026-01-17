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

const getTrendRotationClass = (trend?: CgmReading['Trend']) => {
    if (!trend) return 'hidden';
    switch (trend) {
        case 'rising quickly':
            return '-rotate-[135deg]';
        case 'rising':
            return '-rotate-90';
        case 'rising slightly':
            return '-rotate-45';
        case 'steady':
            return 'hidden'; // Hide arrow for steady
        case 'falling slightly':
            return 'rotate-45';
        case 'falling':
            return 'rotate-90';
        case 'falling quickly':
            return 'rotate-[135deg]';
        default:
            return 'hidden';
    }
};

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

    const getStatusBadgeClasses = (status?: CgmReading['Status']) => {
        if (!status) return 'text-muted-foreground bg-muted border-border';
        switch (status) {
            case 'low': return 'text-destructive-foreground bg-destructive border-destructive';
            case 'high': return 'text-warning-foreground bg-warning border-warning';
            case 'ok':
            default: return 'text-success-foreground bg-success border-success';
        }
    };
    
    const getStatusDialClasses = (status?: CgmReading['Status']) => {
        if (!status) return {
            border: 'border-muted',
            bg: 'bg-muted/50',
            text: 'text-muted-foreground',
            arrow: 'border-l-muted'
        };
        switch (status) {
            case 'low': return {
                border: 'border-destructive',
                bg: 'bg-destructive/10',
                text: 'text-destructive text-glow-primary',
                arrow: 'border-l-destructive'
            };
            case 'high': return {
                border: 'border-warning',
                bg: 'bg-warning/10',
                text: 'text-warning text-glow-primary',
                arrow: 'border-l-warning'
            };
            case 'ok':
            default: return {
                border: 'border-primary',
                bg: 'bg-primary/10',
                text: 'text-primary text-glow-primary',
                arrow: 'border-l-primary'
            };
        }
    }

    const statusBadgeClasses = getStatusBadgeClasses(data?.Status);
    const statusDialClasses = getStatusDialClasses(data?.Status);
    const isQuickTrend = data?.Trend === 'rising quickly' || data?.Trend === 'falling quickly';

    return (
        <div className="w-full max-w-sm font-sans">
            <header className="text-center mb-6">
                <h1 className="text-4xl font-bold text-primary text-glow-primary">
                    DEXCOM G7
                </h1>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">
                    CGM SYSTEM
                </p>
            </header>

            <nav className="flex gap-2 mb-8 bg-secondary p-1 rounded-lg">
                <Link href="/dashboard" className={cn("flex-1 py-2 px-4 rounded-md text-sm font-semibold text-center transition-colors", { 'bg-primary text-primary-foreground': pathname.startsWith('/dashboard'), 'text-muted-foreground hover:bg-primary/20': !pathname.startsWith('/dashboard') })}>
                    Monitor
                </Link>
                <Link href="/log" className={cn("flex-1 py-2 px-4 rounded-md text-sm font-semibold text-center transition-colors", { 'bg-primary text-primary-foreground': pathname.startsWith('/log'), 'text-muted-foreground hover:bg-primary/20': !pathname.startsWith('/log') })}>
                    Log
                </Link>
            </nav>

            {error && (
                <div className="bg-destructive/20 border border-destructive text-destructive p-3 rounded-lg mb-6 text-center text-sm">
                    {error}
                </div>
            )}

            <div className="relative w-56 h-56 mx-auto mb-16">
                <div className={cn(
                    "w-full h-full rounded-full border-[20px] flex flex-col items-center justify-center transition-colors glow-primary",
                    statusDialClasses.border,
                    statusDialClasses.bg,
                )}>
                    <div className="flex items-baseline">
                        <div className={cn("text-6xl font-bold", statusDialClasses.text)}>
                            {loading ? '--' : data?.Glucose}
                        </div>
                    </div>
                    <div className="text-lg text-muted-foreground mt-1">
                        mg/dL
                    </div>
                </div>
                <div
                    className={cn(
                        "absolute inset-0 transition-transform duration-500",
                        getTrendRotationClass(data?.Trend)
                    )}
                >
                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-0 h-0",
                        "right-[-18px]", // Connects to perimeter
                        "border-y-[28px] border-y-transparent",
                        "border-l-[48px]",
                        statusDialClasses.arrow
                    )} />

                    {isQuickTrend && (
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-0 h-0",
                            "right-[-44px]",
                            "border-y-[28px] border-y-transparent",
                            "border-l-[48px]",
                            statusDialClasses.arrow
                        )} />
                    )}
                </div>
            </div>

            <div className="bg-card rounded-xl p-1 border border-border shadow-md mb-6">
                 <div className="flex justify-between items-center p-3 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border', statusBadgeClasses)}>
                        <span className={cn('w-2 h-2 rounded-full', statusBadgeClasses.replace('text-','bg-'))}/>
                        <span>{loading ? 'Loading' : data?.Status || '--'}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center p-3 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">Trend</span>
                    <span className="text-sm font-semibold text-foreground capitalize">{loading ? '--' : data?.Trend}</span>
                </div>
                <div className="flex justify-between items-center p-3 border-b border-border">
                    <span className="text-sm font-medium text-muted-foreground">Last Reading</span>
                    <span className="text-sm font-semibold text-foreground">{data?.Time ? new Date(data.Time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                </div>
                <div className="flex justify-between items-center p-3">
                    <span className="text-sm font-medium text-muted-foreground">Time Since</span>
                    <span className="text-sm font-semibold text-foreground">{loading ? '--' : timeSince}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-xl p-4 text-center border border-destructive/50 shadow-md">
                    <div className="text-xs font-semibold uppercase text-destructive">Low Alert</div>
                    <div className="text-3xl font-bold text-destructive mt-1">60</div>
                </div>
                 <div className="bg-card rounded-xl p-4 text-center border border-warning/50 shadow-md">
                    <div className="text-xs font-semibold uppercase text-warning">High Alert</div>
                    <div className="text-3xl font-bold text-warning mt-1">250</div>
                </div>
            </div>

            <button onClick={fetchGlucose} disabled={loading} className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold transition-colors hover:bg-primary/80 disabled:bg-primary/50">
                {loading ? 'Updating...' : 'Refresh Data'}
            </button>
            <div className="text-center mt-3 text-xs text-muted-foreground">
                Last updated: {lastSync ? lastSync.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
            </div>
        </div>
    );
}
