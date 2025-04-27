"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"; // Use relative path
import type { ChartConfig } from "../ui/chart"; // Import ChartConfig as a type
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart"; // Import components separately

interface ArticlesPerSourceBarChartProps {
  data: { source_name: string; article_count: number }[];
}

const chartConfig = {
  article_count: {
    label: "Articles",
    color: "hsl(var(--chart-1))", // Use a theme color
  },
  source_name: {
    label: "Source",
    color: "hsl(var(--background))", // Color for the label
  },
} satisfies ChartConfig;

export function ArticlesPerSourceBarChart({ data }: ArticlesPerSourceBarChartProps) {
  // Use the data prop instead of hardcoded chartData

  return (
    <Card>
      <CardHeader className="pt-4"> {/* Added top padding */}
        <CardTitle>Articles per Source</CardTitle>
        <CardDescription>Number of articles from each source</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data} // Use the data prop
            layout="vertical" // Use vertical layout
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} /> {/* Use horizontal=false for vertical layout */}
            <YAxis
              dataKey="source_name" // Use source_name for Y axis in vertical layout
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // tickFormatter={(value) => value.slice(0, 3)} // Optional: shorten source names
              hide // Hide Y axis labels if using LabelList
            />
            <XAxis dataKey="article_count" type="number" hide /> {/* Use article_count for X axis in vertical layout, hide axis */}
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />} // Use line indicator for vertical layout tooltip
            />
            <Bar
              dataKey="article_count" // Use article_count for dataKey
              layout="vertical"
              fill="var(--color-article_count)" // Use theme color
              radius={4} // Use radius from example
            >
              <LabelList
                dataKey="source_name" // Label with source name
                position="insideLeft" // Position label inside bars
                offset={8}
                className="fill-[--color-source_name]" // Use theme color for label
                fontSize={12}
              />
               <LabelList
                dataKey="article_count" // Label with article count
                position="right" // Position label outside bars
                offset={8}
                className="fill-foreground" // Use foreground color for label
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      {/* Footer can be adapted to show relevant stats */}
      {/* For example, total articles or average articles per source */}
      {/* <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Total Articles: {data.reduce((sum, item) => sum + item.article_count, 0)}
        </div>
      </CardFooter> */}
    </Card>
  );
}
