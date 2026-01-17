'use server';

import { compareCgmWithManualLog, CompareCgmWithManualLogOutput } from '@/ai/flows/compare-cgm-with-manual-log';
import { getLiveCgmReading } from '@/lib/dexcom';
import { z } from 'zod';

const LogReadingSchema = z.object({
  manualValue: z.number().positive("Blood sugar value must be a positive number."),
  diazoxideDose: z.number().positive("Diazoxide dose must be a positive number.").optional(),
});

export type LogReadingInput = z.infer<typeof LogReadingSchema>;

export type LogEntry = {
    id: string;
    timestamp: string;
    manual: number;
    cgm: number;
    diazoxideDose?: number;
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

export async function compareReadingsAction(input: LogReadingInput): Promise<ActionResult> {

    const validation = LogReadingSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }
    const { manualValue, diazoxideDose } = input;

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
            diazoxideDose,
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
