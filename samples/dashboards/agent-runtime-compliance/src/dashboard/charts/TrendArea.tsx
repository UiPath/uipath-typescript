import React from 'react'
import { AreaChart, Area, Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/dashboard/chrome'
import type { Row } from '@/lib/metric-contract'

interface TrendProps { data: Row[]; xKey: string; yKey: string; title?: string; area?: boolean; height?: number; emptyMessage?: string }

export function TrendArea({ data, xKey, yKey, title, area = true, height = 220, emptyMessage = 'No data' }: TrendProps) {
  const hasData = data && data.length > 0
  return (
    <Card>
      {title && <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>}
      <CardContent className="pt-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height={height}>
            {area ? (
              <AreaChart data={data}>
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey={yKey} stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} />
              </AreaChart>
            ) : (
              <LineChart data={data}>
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey={yKey} stroke="hsl(var(--chart-1))" dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : <EmptyState message={emptyMessage} />}
      </CardContent>
    </Card>
  )
}
