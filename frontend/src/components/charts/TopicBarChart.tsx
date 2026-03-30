import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
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

interface TopicBarChartProps {
  data: { name: string; article_count: number }[];
}

const chartConfig = {
  article_count: {
    label: "Articles",
    color: "var(--chart-3)",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

export function TopicBarChart({ data }: TopicBarChartProps) {
  const sorted = [...data].sort((a, b) => b.article_count - a.article_count);

  return (
    <Card>
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">Top Topics</CardTitle>
        <CardDescription>
          Articles by topic (top {sorted.length})
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: Math.max(180, sorted.length * 32) }}
        >
          <BarChart
            accessibilityLayer
            data={sorted}
            layout="vertical"
            margin={{ right: 56, left: 4 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <YAxis
              dataKey="name"
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
              radius={[0, 6, 6, 0]}
            >
              <LabelList
                dataKey="name"
                position="insideLeft"
                offset={8}
                className="fill-(--color-label)"
                fontSize={11}
                fontWeight={500}
              />
              <LabelList
                dataKey="article_count"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={11}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
