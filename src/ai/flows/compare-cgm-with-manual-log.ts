'use server';

/**
 * @fileOverview Compares CGM data with manually logged blood sugar levels, using AI to identify discrepancies and suggest potential actions.
 *
 * - compareCgmWithManualLog - A function that compares CGM data with manual logs.
 * - CompareCgmWithManualLogInput - The input type for the compareCgmWithManualLog function.
 * - CompareCgmWithManualLogOutput - The return type for the compareCgmWithManualLog function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareCgmWithManualLogInputSchema = z.object({
  cgmValue: z.number().describe('The blood sugar level from the CGM.'),
  manualLogValue: z.number().describe('The blood sugar level from the manual glucometer log.'),
  timestamp: z.string().describe('The timestamp of the blood sugar readings.'),
});
export type CompareCgmWithManualLogInput = z.infer<typeof CompareCgmWithManualLogInputSchema>;

const CompareCgmWithManualLogOutputSchema = z.object({
  discrepancyDetected: z.boolean().describe('Whether a discrepancy is detected between the CGM and manual log values.'),
  discrepancyExplanation: z.string().describe('Explanation of the discrepancy and potential reasons.'),
  suggestedAction: z.string().describe('Suggested action based on the comparison, such as contacting a doctor.'),
});
export type CompareCgmWithManualLogOutput = z.infer<typeof CompareCgmWithManualLogOutputSchema>;

export async function compareCgmWithManualLog(input: CompareCgmWithManualLogInput): Promise<CompareCgmWithManualLogOutput> {
  return compareCgmWithManualLogFlow(input);
}

const compareCgmWithManualLogPrompt = ai.definePrompt({
  name: 'compareCgmWithManualLogPrompt',
  input: {schema: CompareCgmWithManualLogInputSchema},
  output: {schema: CompareCgmWithManualLogOutputSchema},
  prompt: `You are an AI assistant that compares CGM data with manually logged blood sugar levels to identify discrepancies and suggest potential actions.

  CGM Value: {{cgmValue}}
  Manual Log Value: {{manualLogValue}}
  Timestamp: {{timestamp}}

  Analyze the provided CGM value and manual log value. Determine if there is a significant discrepancy between the two values. Consider that some variance is normal due to differences in measurement techniques and timing. If a discrepancy is detected, provide a clear explanation of the potential reasons for the discrepancy.  Finally, suggest an action based on the comparison, such as retesting, consulting a healthcare professional, or adjusting insulin dosage.

  Be sure to set the discrepancyDetected field to true or false.
`,
});

const compareCgmWithManualLogFlow = ai.defineFlow(
  {
    name: 'compareCgmWithManualLogFlow',
    inputSchema: CompareCgmWithManualLogInputSchema,
    outputSchema: CompareCgmWithManualLogOutputSchema,
  },
  async input => {
    const {output} = await compareCgmWithManualLogPrompt(input);
    return output!;
  }
);
