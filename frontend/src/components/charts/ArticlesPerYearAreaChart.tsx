"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"; // Keep YAxis for data mapping

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

interface ArticlesPerYearBarChartProps {
  data: { year: number; article_count: number }[];
}

const chartConfig = {
  article_count: { // Data key for the bars
    label: "Articles",
    color: "hsl(var(--chart-2))", // Use a different theme color
  },
  year: { // Data key for the X axis
    label: "Year",
  },
} satisfies ChartConfig;

export function ArticlesPerYearBarChart({ data }: ArticlesPerYearBarChartProps) {
  // Use the data prop

  return (
    <Card>
      <CardHeader>
        <CardTitle>Articles per Year</CardTitle> {/* Updated title */}
        <CardDescription>Number of articles published each year</CardDescription> {/* Updated description */}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={data} // Use the data prop
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} /> {/* Keep vertical=false for vertical bars */}
            <XAxis
              dataKey="year" // Use year for X axis
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              // tickFormatter={(value) => value.toString()} // Format year as string
            />
             <YAxis // Keep YAxis for value scale
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />} // Use hideLabel from example
            />
            <Bar
              dataKey="article_count" // Use article_count for dataKey
              fill="var(--color-article_count)" // Use theme color
              radius={8} // Use radius from example
            >
              <LabelList
                position="top" // Position label on top
                offset={12}
                className="fill-foreground" // Use foreground color for label
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      {/* Footer can be adapted */}
    </Card>
  );
}
