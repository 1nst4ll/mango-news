import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { SourceDistributionPieChart } from "../charts/SourceDistributionPieChart";
import { ArticlesTimelineChart } from "../charts/ArticlesTimelineChart";
import { SourceBarChart } from "../charts/SourceBarChart";
import { TopicBarChart } from "../charts/TopicBarChart";
import { AiCoverageChart } from "../charts/AiCoverageChart";
import { RefreshCw, Newspaper, Globe, Zap, FileText, Tag, Image, Languages, Mic, Clock, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import type { ArticleStats } from './types';

export interface OverviewStatsProps {
  stats: ArticleStats;
  statsLoading: boolean;
  statsError: string | null;
  statsLastUpdated: Date | null;
  fetchStats: () => void;
  activeSources: number;
  aiCoverage: {
    withSummary: number;
    withTags: number;
    withImage: number;
    withTranslations: number;
    total: number;
  } | null;
}

const OverviewStats: React.FC<OverviewStatsProps> = ({
  stats,
  statsLoading,
  statsError,
  statsLastUpdated,
  fetchStats,
  activeSources,
  aiCoverage,
}) => {
  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your news aggregation platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statsLastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {format(statsLastUpdated, 'MMM d, HH:mm:ss')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={statsLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {statsError && (
        <Alert variant="destructive">
          <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardDescription className="text-xs font-medium">Total Articles</CardDescription>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {(stats.totalArticles ?? 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardDescription className="text-xs font-medium">Total Sources</CardDescription>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {stats.totalSources ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success font-medium">{activeSources} active</span>
                  {(stats.totalSources ?? 0) - activeSources > 0 && (
                    <span> / {(stats.totalSources ?? 0) - activeSources} inactive</span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardDescription className="text-xs font-medium">Avg. per Source</CardDescription>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {stats.totalSources && stats.totalArticles
                  ? Math.round(stats.totalArticles / stats.totalSources).toLocaleString()
                  : '0'}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
            <CardDescription className="text-xs font-medium">Years Covered</CardDescription>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {stats.articlesPerYear.length}
                </div>
                {stats.articlesPerYear.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.min(...stats.articlesPerYear.map(y => y.year))} &ndash; {Math.max(...stats.articlesPerYear.map(y => y.year))}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sunday Edition stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
          <CardDescription className="text-xs font-medium">Sunday Editions</CardDescription>
          <Mic className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-4">
          {statsLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="flex items-baseline gap-6 flex-wrap">
              <div>
                <span className="text-3xl font-bold tracking-tight">{stats.sundayEditionStats?.total ?? 0}</span>
                <span className="text-sm text-muted-foreground ml-1">total</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  <span className="font-medium text-success">{stats.sundayEditionStats?.withImage ?? 0}</span>
                  <span className="text-muted-foreground ml-1">with image</span>
                </span>
                <span>
                  <span className="font-medium text-success">{stats.sundayEditionStats?.withAudio ?? 0}</span>
                  <span className="text-muted-foreground ml-1">with audio</span>
                </span>
                {(stats.sundayEditionStats?.total ?? 0) > 0 && stats.sundayEditionStats?.newest && (
                  <span>
                    <span className="text-muted-foreground">Latest: </span>
                    <span className="font-medium">{new Date(stats.sundayEditionStats.newest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline chart — spans 2 cols */}
        <div className="lg:col-span-2">
          {statsLoading ? (
            <Card className="h-full">
              <CardHeader className="pt-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <ArticlesTimelineChart data={stats.articlesPerYear || []} />
          )}
        </div>

        {/* Pie chart — 1 col */}
        <div>
          {statsLoading ? (
            <Card className="h-full">
              <CardHeader className="pt-4 items-center">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardHeader>
              <CardContent className="flex justify-center">
                <Skeleton className="h-[180px] w-[180px] rounded-full" />
              </CardContent>
            </Card>
          ) : (
            <SourceDistributionPieChart data={stats.articlesPerSource || []} />
          )}
        </div>
      </div>

      {/* AI Coverage radial charts */}
      {aiCoverage && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">AI Coverage</h3>
            <p className="text-xs text-muted-foreground">Processing status based on per-source configuration</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AiCoverageChart
              label="Summaries"
              value={aiCoverage.withSummary}
              total={aiCoverage.total}
              color="var(--chart-1)"
              icon={<FileText className="h-3 w-3" />}
            />
            <AiCoverageChart
              label="Tags"
              value={aiCoverage.withTags}
              total={aiCoverage.total}
              color="var(--chart-2)"
              icon={<Tag className="h-3 w-3" />}
            />
            <AiCoverageChart
              label="Images"
              value={aiCoverage.withImage}
              total={aiCoverage.total}
              color="var(--chart-4)"
              icon={<Image className="h-3 w-3" />}
            />
            <AiCoverageChart
              label="Translations"
              value={aiCoverage.withTranslations}
              total={aiCoverage.total}
              color="var(--chart-5)"
              icon={<Languages className="h-3 w-3" />}
            />
          </div>
        </div>
      )}

      {/* Article freshness & blocked count */}
      {!statsLoading && stats.freshness && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> Last 24h
              </div>
              <div className="text-2xl font-bold">{stats.freshness.last24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> Last 7 days
              </div>
              <div className="text-2xl font-bold">{stats.freshness.last7d}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> Last 30 days
              </div>
              <div className="text-2xl font-bold">{stats.freshness.last30d}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <ShieldAlert className="h-3 w-3" /> Blocked
              </div>
              <div className="text-2xl font-bold text-destructive">{stats.freshness.blockedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row: Sources + Topics side by side */}
      {!statsLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(stats.articlesPerSource?.length ?? 0) > 0 && (
            <SourceBarChart data={stats.articlesPerSource} />
          )}
          {(stats.topicStats?.length ?? 0) > 0 && (
            <TopicBarChart data={stats.topicStats!} />
          )}
        </div>
      )}

    </div>
  );
};

export default OverviewStats;
