'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { generateCgmData } from '@/lib/data';
import { Activity } from 'lucide-react';
import React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const chartData = generateCgmData();

const chartConfig = {
  bloodSugar: {
    label: 'Blood Sugar',
    color: 'hsl(var(--primary))',
  },
};

export default function DashboardPage() {
  const [latestReading] = React.useState(chartData[chartData.length - 1]);
  const averageReading = Math.round(
    chartData.reduce((acc, item) => acc + item.value, 0) / chartData.length
  );

  return (
    <div className="p-4 md:p-8 grid gap-8">
      <header className="flex items-center gap-4">
        <Activity className="w-8 h-8 text-primary drop-shadow-glow-primary" />
        <h1 className="font-headline text-3xl md:text-4xl text-primary drop-shadow-glow-primary">
          CGM Data Feed
        </h1>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-headline">Latest Reading</CardTitle>
            <CardDescription>
              Most recent value from your CGM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-primary drop-shadow-glow-primary">
              {latestReading.value}
              <span className="text-xl text-muted-foreground ml-2">mg/dL</span>
            </p>
            <p className="text-muted-foreground mt-2">
              as of {latestReading.time}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-headline">24h Average</CardTitle>
            <CardDescription>
              Average blood sugar over the last day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-accent drop-shadow-glow-accent">
              {averageReading}
              <span className="text-xl text-muted-foreground ml-2">mg/dL</span>
            </p>
            <p className="text-muted-foreground mt-2">
              Based on {chartData.length} readings.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline">Blood Sugar Trend (24h)</CardTitle>
          <CardDescription>
            Visual representation of your blood sugar levels over the past 24
            hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 5)}
              />
              <YAxis
                domain={['dataMin - 20', 'dataMax + 20']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <defs>
                <linearGradient id="fillBloodSugar" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="natural"
                fill="url(#fillBloodSugar)"
                stroke="hsl(var(--primary))"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
