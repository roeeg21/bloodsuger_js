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
            return 'rotate-0';
        case 'falling slightly':
            return 'rotate-45';
        case 'falling':
            return 'rotate-90';
        case 'falling quickly':
            return 'rotate-[135deg]';
        default:
            return 'rotate-0'; // Default to steady if trend is unknown
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
        if (!status) return 'text-slate-600 bg-slate-100 border-slate-200';
        switch (status) {
            case 'low': return 'text-red-600 bg-red-100 border-red-200';
            case 'high': return 'text-amber-600 bg-amber-100 border-amber-200';
            case 'ok':
            default: return 'text-green-600 bg-green-100 border-green-200';
        }
    };
    
    const getStatusDialClasses = (status?: CgmReading['Status']) => {
        if (!status) return {
            border: 'border-slate-300',
            bg: 'bg-slate-100',
            text: 'text-slate-800',
            arrow: 'border-b-slate-300'
        };
        switch (status) {
            case 'low': return {
                border: 'border-red-400',
                bg: 'bg-red-50',
                text: 'text-red-900',
                arrow: 'border-b-red-400'
            };
            case 'high': return {
                border: 'border-amber-400',
                bg: 'bg-amber-50',
                text: 'text-amber-900',
                arrow: 'border-b-amber-400'
            };
            case 'ok':
            default: return {
                border: 'border-green-400',
                bg: 'bg-green-50',
                text: 'text-green-900',
                arrow: 'border-b-green-400'
            };
        }
    }

    const statusBadgeClasses = getStatusBadgeClasses(data?.Status);
    const statusDialClasses = getStatusDialClasses(data?.Status);
    const isQuickTrend = data?.Trend === 'rising quickly' || data?.Trend === 'falling quickly';


    return (
        <div className="w-full max-w-sm font-sans">
            <header className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">
                    DEXCOM G7
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                    CGM SYSTEM
                </p>
            </header>

            <nav className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-lg">
                <Link href="/dashboard" className={cn("flex-1 py-2 px-4 rounded-md text-sm font-semibold text-center transition-colors", { 'bg-white shadow-sm text-slate-800': pathname.startsWith('/dashboard'), 'text-slate-600 hover:bg-slate-200': !pathname.startsWith('/dashboard') })}>
                    Monitor
                </Link>
                <Link href="/log" className={cn("flex-1 py-2 px-4 rounded-md text-sm font-semibold text-center transition-colors", { 'bg-white shadow-sm text-slate-800': pathname.startsWith('/log'), 'text-slate-600 hover:bg-slate-200': !pathname.startsWith('/log') })}>
                    Log
                </Link>
            </nav>

            {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg mb-6 text-center text-sm">
                    {error}
                </div>
            )}

            <div className="relative w-56 h-56 mx-auto mb-10">
                <div className={cn(
                    "w-full h-full rounded-full border-[16px] flex flex-col items-center justify-center transition-colors",
                    statusDialClasses.border,
                    statusDialClasses.bg,
                    statusDialClasses.text
                    )}>
                    <div className="flex items-baseline">
                        <div className="text-6xl font-bold">
                            {loading ? '--' : data?.Glucose}
                        </div>
                    </div>
                    <div className="text-lg text-slate-500 mt-1">
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
                        "right-[-10px]",
                        "border-y-[16px] border-y-transparent",
                        "border-l-[26px]",
                        statusDialClasses.arrow.replace('border-b-', 'border-l-')
                    )} />

                    {isQuickTrend && (
                        <div className={cn(
                            "absolute top-1/2 -translate-y-1/2 w-0 h-0",
                            "right-[-22px]",
                            "border-y-[16px] border-y-transparent",
                            "border-l-[26px]",
                            statusDialClasses.arrow.replace('border-b-', 'border-l-')
                        )} />
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl p-1 border border-slate-200 shadow-sm mb-6">
                 <div className="flex justify-between items-center p-3 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-500">Status</span>
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border', statusBadgeClasses)}>
                        <span className={cn('w-2 h-2 rounded-full', statusBadgeClasses.replace('text-','bg-').replace('border-',''))}/>
                        <span>{loading ? 'Loading' : data?.Status || '--'}</span>
                    </div>
                </div>
                <div className="flex justify-between items-center p-3 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-500">Trend</span>
                    <span className="text-sm font-semibold text-slate-700 capitalize">{loading ? '--' : data?.Trend}</span>
                </div>
                <div className="flex justify-between items-center p-3 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-500">Last Reading</span>
                    <span className="text-sm font-semibold text-slate-700">{data?.Time ? new Date(data.Time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                </div>
                <div className="flex justify-between items-center p-3">
                    <span className="text-sm font-medium text-slate-500">Time Since</span>
                    <span className="text-sm font-semibold text-slate-700">{loading ? '--' : timeSince}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 text-center border border-red-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-red-500">Low Alert</div>
                    <div className="text-3xl font-bold text-red-600 mt-1">60</div>
                </div>
                 <div className="bg-white rounded-xl p-4 text-center border border-amber-200 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-amber-500">High Alert</div>
                    <div className="text-3xl font-bold text-amber-600 mt-1">250</div>
                </div>
            </div>

            <button onClick={fetchGlucose} disabled={loading} className="w-full py-3 px-4 bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors hover:bg-slate-700 disabled:bg-slate-400">
                {loading ? 'Updating...' : 'Refresh Data'}
            </button>
            <div className="text-center mt-3 text-xs text-slate-500">
                Last updated: {lastSync ? lastSync.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
            </div>
        </div>
    );
}
