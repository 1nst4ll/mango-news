import * as React from "react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ChartConfig } from "../ui/chart";
import { ChartContainer } from "../ui/chart";

interface AiCoverageChartProps {
  label: string;
  value: number;
  total: number;
  color: string;
  icon?: React.ReactNode;
}

export function AiCoverageChart({ label, value, total, color, icon }: AiCoverageChartProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const endAngle = 90 - (pct / 100) * 360;

  const chartData = [{ name: label, value: pct, fill: color }];

  const chartConfig = {
    value: {
      label,
      color,
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0 pt-4 px-4">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 px-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[120px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={endAngle}
            innerRadius={40}
            outerRadius={56}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[44, 36]}
            />
            <RadialBar
              dataKey="value"
              background
              cornerRadius={10}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-lg font-bold"
                        >
                          {pct}%
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardTitle className="text-center text-xs font-normal text-muted-foreground pb-3 px-2">
        {value.toLocaleString()} / {total.toLocaleString()}
      </CardTitle>
    </Card>
  );
}
