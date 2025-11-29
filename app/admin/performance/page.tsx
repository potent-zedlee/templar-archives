"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { MetricsCard } from "@/components/admin/MetricsCard"
import { Card } from "@/components/ui/card"

// Dynamic import for heavy chart component
const PerformanceChart = dynamic(
  () => import("@/components/admin/PerformanceChart").then(mod => ({ default: mod.PerformanceChart })),
  {
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center text-muted-foreground">차트 로딩 중...</div>
  }
)
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCcw, Activity, Zap, Eye } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { toast } from "sonner"
import {
  getMetricHistory,
  clearMetricHistory,
  getOverallAverageMetrics,
  getAverageMetricsByPage,
  getRecentMetrics,
  getMetricRating,
  type MetricName,
} from "@/lib/analytics/metrics"

const METRIC_DESCRIPTIONS: Record<MetricName, string> = {
  LCP: "Largest Contentful Paint - 주요 콘텐츠 로딩 시간",
  FID: "First Input Delay - 첫 입력 응답 시간",
  CLS: "Cumulative Layout Shift - 레이아웃 변경 정도",
  FCP: "First Contentful Paint - 첫 콘텐츠 표시 시간",
  TTFB: "Time to First Byte - 첫 바이트 응답 시간",
  INP: "Interaction to Next Paint - 상호작용 응답성",
}

export default function PerformancePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const metrics = getMetricHistory()
  const overallAverages = getOverallAverageMetrics()
  const pageAverages = getAverageMetricsByPage()
  const recentMetrics = getRecentMetrics(20)

  const checkAccess = useCallback(async () => {
    // Wait for auth loading to complete
    if (authLoading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  function handleClearHistory() {
    if (confirm("Are you sure you want to clear all performance metrics history?")) {
      clearMetricHistory()
      setRefreshKey((prev) => prev + 1)
      toast.success("Performance metrics history cleared")
    }
  }

  function handleRefresh() {
    setRefreshKey((prev) => prev + 1)
    toast.success("Performance data refreshed")
  }

  if (!hasAccess) {
    return null
  }

  return (
    <>

      <div className="container max-w-7xl mx-auto py-8 px-4" key={refreshKey}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-title-lg mb-2">Performance Dashboard</h1>
            <p className="text-body text-muted-foreground">
              Monitor Core Web Vitals and application performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.length}</div>
                <div className="text-sm text-muted-foreground">Total Metrics</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-chart-2/10">
                <Eye className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <div className="text-2xl font-bold">{Object.keys(pageAverages).length}</div>
                <div className="text-sm text-muted-foreground">Pages Tracked</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-chart-3/10">
                <Zap className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <div className="text-2xl font-bold">{recentMetrics.length}</div>
                <div className="text-sm text-muted-foreground">Recent Samples</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="pages">By Page</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'] as MetricName[]).map((metricName) => {
                const value = overallAverages[metricName]
                if (!value) return null

                const rating = getMetricRating(metricName, value)

                return (
                  <MetricsCard
                    key={metricName}
                    name={metricName}
                    value={value}
                    rating={rating}
                    description={METRIC_DESCRIPTIONS[metricName]}
                  />
                )
              })}
            </div>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {(['LCP', 'FCP', 'CLS'] as MetricName[]).map((metricName) => (
              <PerformanceChart
                key={metricName}
                metrics={recentMetrics}
                metricName={metricName}
                title={`${metricName} - ${METRIC_DESCRIPTIONS[metricName]}`}
              />
            ))}
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Page</h3>
              <div className="space-y-4">
                {Object.entries(pageAverages).map(([pathname, pageMetrics]) => (
                  <div key={pathname} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{pathname}</h4>
                      <Badge variant="outline">
                        {Object.keys(pageMetrics).filter((k) => pageMetrics[k as MetricName]).length} metrics
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {(['LCP', 'FCP', 'CLS'] as MetricName[]).map((metricName) => {
                        const value = pageMetrics[metricName]
                        if (!value) return null

                        return (
                          <div key={metricName} className="flex justify-between">
                            <span className="text-muted-foreground">{metricName}:</span>
                            <span className="font-medium">
                              {metricName === 'CLS' ? value.toFixed(3) : Math.round(value)}
                              {metricName === 'CLS' ? '' : 'ms'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {Object.keys(pageAverages).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No page metrics available. Navigate through the site to collect data.
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
