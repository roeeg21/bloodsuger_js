'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Bot,
  Code,
  Download,
  Home,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ActionResult, compareReadingsAction, LogEntry, LogReadingInput } from './actions';
import Link from 'next/link';
import { CgmNav } from '@/components/cgm-nav';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { exportToCsv } from '@/lib/csv';

const formSchema = z.object({
  manualValue: z.coerce
    .number({ invalid_type_error: 'Please enter a valid number.' })
    .positive('Blood sugar must be a positive number.')
    .min(20, 'Value seems too low.')
    .max(600, 'Value seems too high.'),
  diazoxideDose: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce
      .number({ invalid_type_error: 'Please enter a valid number.' })
      .positive('Dose must be a positive number.')
      .optional()
  ),
});

const calculatorSchema = z.object({
  bodyWeight: z.coerce
    .number({ invalid_type_error: 'Please enter a valid number.' })
    .positive('Body weight must be a positive number.'),
  diazoxideDose: z.coerce
    .number({ invalid_type_error: 'Please enter a valid number.' })
    .positive('Diazoxide dose must be a positive number.'),
});

export default function LogPage() {
  const [isPending, startTransition] = React.useTransition();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = React.useState<ActionResult | null>(
    null
  );
  const [calculatedDose, setCalculatedDose] = React.useState<number | null>(
    null
  );
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manualValue: undefined,
      diazoxideDose: undefined,
    },
  });

  const calculatorForm = useForm<z.infer<typeof calculatorSchema>>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      bodyWeight: undefined,
      diazoxideDose: undefined,
    },
  });

  const bodyWeightValue = useWatch({
    control: calculatorForm.control,
    name: 'bodyWeight',
  });
  const calculatorDoseValue = useWatch({
    control: calculatorForm.control,
    name: 'diazoxideDose',
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await compareReadingsAction(values as LogReadingInput);
      setLastResult(result);
      if (result.success && result.newLog) {
        setLogs(prev => [result.newLog!, ...prev]);
        form.reset();
      } else if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
    });
  }

  React.useEffect(() => {
    const bodyWeight = Number(bodyWeightValue);
    const diazoxideDose = Number(calculatorDoseValue);
    if (Number.isFinite(bodyWeight) && bodyWeight > 0 && Number.isFinite(diazoxideDose) && diazoxideDose > 0) {
      setCalculatedDose((diazoxideDose * 3 * 50) / bodyWeight);
      return;
    }
    setCalculatedDose(null);
  }, [bodyWeightValue, calculatorDoseValue]);

  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'Please log some entries before exporting.',
      });
      return;
    }
    exportToCsv(
      `sugarcheck-pro-logs-${new Date().toISOString().split('T')[0]}.csv`,
      logs
    );
  };

  const sanitizeDecimalInput = (value: string) => {
    const filtered = value.replace(/[^0-9.]/g, '');
    const [intPart = '', fracPart] = filtered.split('.', 2);
    let sanitized = intPart.slice(0, 3);
    if (filtered.includes('.')) {
      sanitized += `.${(fracPart ?? '').slice(0, 3)}`;
    }
    return sanitized;
  };

  const panelClass =
    'rounded-3xl border border-white/10 bg-card/80 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl';
  const iosRowInputClass =
    'h-auto rounded-none border-0 border-b border-[#3e4046] bg-transparent px-0 py-1.5 text-right text-base text-white shadow-none focus-visible:ring-0 focus-visible:ring-offset-0';

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-4">
        <CgmNav />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Back to Monitor
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <a href="/api/cgm" target="_blank" rel="noopener noreferrer">
              <Code className="mr-2 h-4 w-4" />
              View API
            </a>
          </Button>
        </div>
      </div>
      <div className="grid gap-5">
        <Card className={panelClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-[22px] font-bold tracking-tight text-white">
              Manual Blood Sugar Log
            </CardTitle>
            <CardDescription className="text-xs">
              Enter your reading from your glucometer to compare with CGM data.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="manualValue"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                          <FormLabel className="mb-0 border-b border-[#3e4046] pb-2 text-[15px] font-medium text-white">
                            Blood Sugar (mg/dL)
                          </FormLabel>
                          <Input
                            placeholder="e.g., 140"
                            type="text"
                            inputMode="decimal"
                            value={field.value == null ? '' : String(field.value)}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(e) => field.onChange(sanitizeDecimalInput(e.target.value))}
                            className={iosRowInputClass}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diazoxideDose"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                          <FormLabel className="mb-0 border-b border-[#3e4046] pb-2 text-[15px] font-medium text-white">
                            Diazoxide Dose (ml)
                          </FormLabel>
                          <Input
                            placeholder="e.g., 2.5"
                            type="text"
                            inputMode="decimal"
                            value={field.value == null ? '' : String(field.value)}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            onChange={(e) => field.onChange(sanitizeDecimalInput(e.target.value))}
                            className={iosRowInputClass}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="pt-1">
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2" />
                  )}
                  Log & Analyze
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card
          className={`${panelClass} transition-all duration-500 ${
            lastResult ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-[22px] font-bold tracking-tight text-white">
              AI Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Comparison between your manual log and the latest CGM reading.
            </CardDescription>
          </CardHeader>
          {isPending && (
            <CardContent className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          )}
          {!isPending && lastResult?.success && lastResult.aiAnalysis && (
            <CardContent className="space-y-4">
              <div
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  lastResult.aiAnalysis.discrepancyDetected
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-success/20 bg-success/10 text-success'
                }`}
              >
                <AlertTriangle
                  className={
                    lastResult.aiAnalysis.discrepancyDetected
                      ? 'text-destructive'
                      : 'text-success'
                  }
                />
                <p className="font-bold">
                  {lastResult.aiAnalysis.discrepancyDetected
                    ? 'Discrepancy Detected'
                    : 'Values are consistent'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h4 className="mb-1 text-sm font-semibold text-white">Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  {lastResult.aiAnalysis.discrepancyExplanation}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <Lightbulb className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-primary">Suggested Action</h4>
                  <p className="text-sm text-primary/80">
                    {lastResult.aiAnalysis.suggestedAction}
                  </p>
                </div>
              </div>
            </CardContent>
          )}
          {!isPending && !lastResult?.success && lastResult?.error && (
            <CardContent className="flex items-center justify-center h-48">
              <p className="text-destructive text-center">{lastResult.error}</p>
            </CardContent>
          )}
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-[22px] font-bold tracking-tight text-white">
            Diazoxide Dose Calculator
          </CardTitle>
          <CardDescription className="text-xs">
            Live calculation of daily dose per kilogram of body weight.
          </CardDescription>
        </CardHeader>
        <Form {...calculatorForm}>
          <form onSubmit={(e) => e.preventDefault()}>
            <CardContent className="space-y-5">
              <FormField
                control={calculatorForm.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                        <FormLabel className="mb-0 border-b border-[#3e4046] pb-2 text-[15px] font-medium text-white">
                          Weight (kg)
                        </FormLabel>
                        <Input
                          placeholder="e.g., 70.0"
                          type="text"
                          inputMode="decimal"
                          value={field.value == null ? '' : String(field.value)}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(sanitizeDecimalInput(e.target.value))}
                          className={iosRowInputClass}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={calculatorForm.control}
                name="diazoxideDose"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                        <FormLabel className="mb-0 border-b border-[#3e4046] pb-2 text-[15px] font-medium text-white">
                          Diazoxide Dose (ml)
                        </FormLabel>
                        <Input
                          placeholder="e.g., 5.0"
                          type="text"
                          inputMode="decimal"
                          value={field.value == null ? '' : String(field.value)}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(sanitizeDecimalInput(e.target.value))}
                          className={iosRowInputClass}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col items-start gap-3">
              {calculatedDose !== null && (
                <div className="w-full rounded-2xl border border-primary/20 bg-primary/8 p-4 text-base font-semibold">
                  Daily Dose:{' '}
                  <span className="font-bold text-primary tracking-tight">
                    {calculatedDose.toFixed(2)} mg/kg/day
                  </span>
                </div>
              )}
              {calculatedDose === null && (
                <p className="text-xs text-muted-foreground">
                  Enter weight and dose to calculate instantly.
                </p>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className={panelClass}>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-[22px] font-bold tracking-tight text-white">
              Log History
            </CardTitle>
            <CardDescription className="text-xs">
              A record of your manual entries.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            <Download className="mr-2" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
              Your logged entries will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="mb-3 text-xs text-muted-foreground">{log.timestamp}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="border-b border-[#3e4046] pb-1 text-muted-foreground">
                      Manual
                    </div>
                    <div className="border-b border-[#3e4046] pb-1 text-right font-semibold text-white">
                      {log.manual} mg/dL
                    </div>
                    <div className="border-b border-[#3e4046] pb-1 text-muted-foreground">
                      CGM
                    </div>
                    <div className="border-b border-[#3e4046] pb-1 text-right font-semibold text-primary">
                      {log.cgm} mg/dL
                    </div>
                    <div className="border-b border-[#3e4046] pb-1 text-muted-foreground">
                      Diazoxide
                    </div>
                    <div className="border-b border-[#3e4046] pb-1 text-right text-white">
                      {log.diazoxideDose ?? '--'} {log.diazoxideDose != null ? 'ml' : ''}
                    </div>
                    <div className="text-muted-foreground">Analysis</div>
                    <div className="text-right">
                      {log.discrepancy ? (
                        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          Discrepancy
                        </span>
                      ) : (
                        <span className="rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                          Consistent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
