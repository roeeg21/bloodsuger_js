'use server';
/**
 * @fileOverview Summarizes blood sugar trends over a specified period, highlighting patterns and potential issues.
 *
 * - summarizeBloodSugarTrends - A function that summarizes blood sugar trends.
 * - SummarizeBloodSugarTrendsInput - The input type for the summarizeBloodSugarTrends function.
 * - SummarizeBloodSugarTrendsOutput - The return type for the summarizeBloodSugarTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBloodSugarTrendsInputSchema = z.object({
  bloodSugarData: z.array(z.object({
    timestamp: z.string(),
    value: z.number(),
    source: z.enum(['dexcom', 'glucometer'])
  })).describe('An array of blood sugar readings with timestamps, values, and source.'),
  period: z.string().describe('The period over which to summarize trends (e.g., last week, last month).'),
});
export type SummarizeBloodSugarTrendsInput = z.infer<typeof SummarizeBloodSugarTrendsInputSchema>;

const SummarizeBloodSugarTrendsOutputSchema = z.object({
  summary: z.string().describe('A summary of the blood sugar trends over the specified period, highlighting patterns and potential issues.'),
  recommendations: z.string().describe('Recommendations based on the identified trends, including whether to consult a doctor.'),
});
export type SummarizeBloodSugarTrendsOutput = z.infer<typeof SummarizeBloodSugarTrendsOutputSchema>;

export async function summarizeBloodSugarTrends(input: SummarizeBloodSugarTrendsInput): Promise<SummarizeBloodSugarTrendsOutput> {
  return summarizeBloodSugarTrendsFlow(input);
}

const summarizeBloodSugarTrendsPrompt = ai.definePrompt({
  name: 'summarizeBloodSugarTrendsPrompt',
  input: {schema: SummarizeBloodSugarTrendsInputSchema},
  output: {schema: SummarizeBloodSugarTrendsOutputSchema},
  prompt: `You are an AI assistant specializing in analyzing blood sugar data and providing summaries and recommendations.

  Analyze the following blood sugar data over the specified period:
  Period: {{{period}}}
  Data:{{#each bloodSugarData}}
  - Timestamp: {{{timestamp}}}, Value: {{{value}}}, Source: {{{source}}}
  {{/each}}

  Provide a summary of the blood sugar trends, highlighting any patterns, high or low values, and potential issues. Also give recommendations based on the blood sugar trends, including whether the user should consult a doctor.
  Summary:
  Recommendations:`,
});

const summarizeBloodSugarTrendsFlow = ai.defineFlow(
  {
    name: 'summarizeBloodSugarTrendsFlow',
    inputSchema: SummarizeBloodSugarTrendsInputSchema,
    outputSchema: SummarizeBloodSugarTrendsOutputSchema,
  },
  async input => {
    const {output} = await summarizeBloodSugarTrendsPrompt(input);
    return output!;
  }
);
