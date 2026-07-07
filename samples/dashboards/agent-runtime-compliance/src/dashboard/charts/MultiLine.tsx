import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/dashboard/chrome'
import type { Row, ChartSeriesDef } from '@/lib/metric-contract'

interface MultiLineProps { data: Row[]; xKey: string; series: ChartSeriesDef[]; title?: string; height?: number; emptyMessage?: string }

export function MultiLine({ data, xKey, series, title, height = 220, emptyMessage = 'No data' }: MultiLineProps) {
  return (
    <Card>
      {title && <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>}
      <CardContent className="pt-2">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              {series.map(s => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState message={emptyMessage} />}
      </CardContent>
    </Card>
  )
}
