import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/dashboard/components'
import type { Row } from '@/lib/metric-contract'

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

interface DonutProps {
  data: Row[]
  nameKey: string
  valueKey: string
  title?: string
  height?: number
  emptyMessage?: string
}

/** Presentational donut — data passed in, no fetch, no navigation. */
export function Donut({ data, nameKey, valueKey, title, height = 220, emptyMessage = 'No data' }: DonutProps) {
  return (
    <Card>
      {title && <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>}
      <CardContent className="pt-2">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={50} outerRadius={80}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </CardContent>
    </Card>
  )
}
