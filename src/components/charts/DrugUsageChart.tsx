// =============================================================================
// BMS Session KPI Dashboard - Drug Usage Chart Component
// =============================================================================

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { DrugUsage } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Pill } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrugUsageChartProps {
  data: DrugUsage[]
  isLoading: boolean
  className?: string
}

export function DrugUsageChart({
  data,
  isLoading,
  className,
}: DrugUsageChartProps) {
  // Sort by cost and take top 10
  const topData = [...data]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">10 อันดับยาที่มีมูลค่าการใช้สูงสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!data || data.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">10 อันดับยาที่มีมูลค่าการใช้สูงสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="ไม่มีข้อมูลการใช้ยา" icon={<Pill className="h-6 w-6" />} />
        </CardContent>
      </Card>
    )
  }

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------
  const COLORS = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">10 อันดับยาที่มีมูลค่าการใช้สูงสุด (บาท)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 10, fontWeight: 500 }}
              width={150}
              axisLine={false}
              tickLine={false}
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tooltip
              formatter={((value: unknown) => [Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 }), 'บาท']) as any}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar
              dataKey="totalCost"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {topData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
