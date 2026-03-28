import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";

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

interface ArticlesPerSourceBarChartProps {
  data: { source_name: string; article_count: number }[];
}

const chartConfig = {
  article_count: {
    label: "Articles",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ArticlesPerSourceBarChart({ data }: ArticlesPerSourceBarChartProps) {
  const total = data.reduce((sum, item) => sum + item.article_count, 0);
  const top = data.length > 0
    ? data.reduce((a, b) => (a.article_count >= b.article_count ? a : b))
    : null;

  return (
    <Card>
      <CardHeader className="pt-4">
        <CardTitle>Articles per Source</CardTitle>
        <CardDescription>Number of articles from each source</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{ right: 48, left: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="source_name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="article_count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="article_count"
              fill="var(--color-article_count)"
              radius={4}
            >
              <LabelList
                dataKey="source_name"
                position="insideLeft"
                offset={8}
                className="fill-background"
                fontSize={12}
              />
              <LabelList
                dataKey="article_count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      {top && (
        <CardFooter className="flex-col items-start gap-1 text-sm pt-0">
          <div className="flex gap-2 font-medium leading-none">
            <TrendingUp className="h-4 w-4 text-chart-1" />
            Top source: {top.source_name} ({top.article_count.toLocaleString()})
          </div>
          <div className="text-xs text-muted-foreground">
            {total.toLocaleString()} total articles across {data.length} source{data.length !== 1 ? 's' : ''}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
