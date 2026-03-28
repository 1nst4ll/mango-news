import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ChartConfig } from "../ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

interface SourceDistributionPieChartProps {
  data: { source_name: string; article_count: number }[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SourceDistributionPieChart({ data }: SourceDistributionPieChartProps) {
  const totalArticles = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.article_count, 0),
    [data]
  );

  const chartData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => b.article_count - a.article_count);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const otherCount = rest.reduce((sum, s) => sum + s.article_count, 0);

    const items = top.map((item, i) => ({
      name: item.source_name,
      value: item.article_count,
      fill: COLORS[i % COLORS.length],
    }));

    if (otherCount > 0) {
      items.push({
        name: "Other",
        value: otherCount,
        fill: COLORS[4],
      });
    }

    return items;
  }, [data]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: { label: "Articles" },
    };
    chartData.forEach((item) => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);

  if (data.length === 0) return null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0 pt-4">
        <CardTitle className="text-sm font-semibold">Source Distribution</CardTitle>
        <CardDescription>Article share by source</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={3}
              stroke="hsl(var(--background))"
            >
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
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalArticles.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          articles
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <div className="px-6 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
              <span className="ml-auto font-medium tabular-nums">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
