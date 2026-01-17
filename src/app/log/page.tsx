'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Bot,
  Download,
  Lightbulb,
  Loader2,
  Home,
  Code,
} from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ActionResult, compareReadingsAction, LogEntry } from './actions';
import Link from 'next/link';

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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { exportToCsv } from '@/lib/csv';

const formSchema = z.object({
  bloodSugar: z.coerce
    .number({ invalid_type_error: 'Please enter a valid number.' })
    .positive('Blood sugar must be a positive number.')
    .min(20, 'Value seems too low.')
    .max(600, 'Value seems too high.'),
});

export default function LogPage() {
  const [isPending, startTransition] = React.useTransition();
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = React.useState<ActionResult | null>(
    null
  );
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bloodSugar: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await compareReadingsAction(values.bloodSugar);
      setLastResult(result);
      if (result.success && result.newLog) {
        setLogs((prev) => [result.newLog!, ...prev]);
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

  return (
    <div className="p-4 md:p-8 grid gap-8 w-full max-w-6xl">
      <div className="flex items-center justify-between -mt-4">
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
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Manual Blood Sugar Log
            </CardTitle>
            <CardDescription>
              Enter your reading from your glucometer to compare with CGM data.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bloodSugar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Sugar (mg/dL)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 140"
                          type="number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                >
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
          className={`transition-all duration-500 ${
            lastResult ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>
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
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  lastResult.aiAnalysis.discrepancyDetected
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-success/10 text-success'
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

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800">Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  {lastResult.aiAnalysis.discrepancyExplanation}
                </p>
              </div>
              <div className="flex items-start gap-3 bg-primary/10 p-3 rounded-lg">
                <Lightbulb className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-primary">Suggested Action</h4>
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

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Log History</CardTitle>
            <CardDescription>A record of your manual entries.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="mr-2" />
            Download CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            {logs.length === 0 && (
              <TableCaption>Your logged entries will appear here.</TableCaption>
            )}
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Manual (mg/dL)</TableHead>
                <TableHead className="text-right">CGM (mg/dL)</TableHead>
                <TableHead>Analysis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell className="text-right font-bold text-accent-foreground">
                    {log.manual}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {log.cgm}
                  </TableCell>
                  <TableCell>
                    {log.discrepancy ? (
                      <span className="text-destructive">Discrepancy</span>
                    ) : (
                      <span className="text-success">Consistent</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
