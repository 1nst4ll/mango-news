import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { ChartConfig } from "../ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

interface ArticlesTimelineChartProps {
  data: { year: number; article_count: number }[];
}

const chartConfig = {
  article_count: {
    label: "Articles",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ArticlesTimelineChart({ data }: ArticlesTimelineChartProps) {
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const total = sorted.reduce((sum, item) => sum + item.article_count, 0);

  const lastTwo = sorted.slice(-2);
  const trend =
    lastTwo.length === 2
      ? lastTwo[1].article_count - lastTwo[0].article_count
      : 0;
  const trendPct =
    lastTwo.length === 2 && lastTwo[0].article_count > 0
      ? Math.round((trend / lastTwo[0].article_count) * 100)
      : null;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend > 0
      ? "text-emerald-500"
      : trend < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">Articles Over Time</CardTitle>
        <CardDescription>Yearly publication trend</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={sorted}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillTimeline" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-article_count)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-article_count)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v) => String(v)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => v.toLocaleString()}
              width={48}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="article_count"
              type="monotone"
              fill="url(#fillTimeline)"
              stroke="var(--color-article_count)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-sm pt-0 pb-4">
        {trendPct !== null && lastTwo.length === 2 && (
          <div
            className={`flex gap-2 font-medium leading-none ${trendColor}`}
          >
            <TrendIcon className="h-4 w-4" />
            {trendPct >= 0 ? "+" : ""}
            {trendPct}% vs {lastTwo[0].year}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {total.toLocaleString()} total across {data.length} year
          {data.length !== 1 ? "s" : ""}
        </div>
      </CardFooter>
    </Card>
  );
}
