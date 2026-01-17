'use server';

import { compareCgmWithManualLog, CompareCgmWithManualLogOutput } from '@/ai/flows/compare-cgm-with-manual-log';
import { getLiveCgmReading } from '@/lib/dexcom';
import { z } from 'zod';

const LogEntrySchema = z.object({
  manualValue: z.number().positive("Blood sugar value must be a positive number."),
});

export type LogEntry = {
    id: string;
    timestamp: string;
    manual: number;
    cgm: number;
    discrepancy: boolean;
    suggestion: string;
    analysis: string;
}

export type ActionResult = {
    success: boolean;
    aiAnalysis?: CompareCgmWithManualLogOutput;
    newLog?: LogEntry;
    error?: string;
}

export async function compareReadingsAction(manualValue: number): Promise<ActionResult> {

    const validation = LogEntrySchema.safeParse({ manualValue });
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    try {
        const timestamp = new Date();
        const liveReading = await getLiveCgmReading();
        const cgmValue = liveReading.Glucose;

        const aiAnalysis = await compareCgmWithManualLog({
            cgmValue,
            manualLogValue: manualValue,
            timestamp: timestamp.toISOString(),
        });
    
        const newLog: LogEntry = {
            id: timestamp.getTime().toString(),
            timestamp: timestamp.toLocaleString(),
            manual: manualValue,
            cgm: cgmValue,
            discrepancy: aiAnalysis.discrepancyDetected,
            suggestion: aiAnalysis.suggestedAction,
            analysis: aiAnalysis.discrepancyExplanation,
        };
        
        return {
            success: true,
            aiAnalysis,
            newLog,
        };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message || "Failed to analyze data. Please try again." }
    }
}
