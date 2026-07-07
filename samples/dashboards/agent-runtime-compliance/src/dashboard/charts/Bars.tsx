import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/dashboard/chrome'
import type { Row } from '@/lib/metric-contract'

interface BarsProps { data: Row[]; nameKey: string; valueKey: string; title?: string; height?: number; emptyMessage?: string }

export function Bars({ data, nameKey, valueKey, title, height = 220, emptyMessage = 'No data' }: BarsProps) {
  return (
    <Card>
      {title && <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>}
      <CardContent className="pt-2">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey={nameKey} width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey={valueKey} fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message={emptyMessage} />}
      </CardContent>
    </Card>
  )
}
