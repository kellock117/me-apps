'use client';

import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { seriesRows, type ChartMode, type ProgressPoint } from '@/lib/reading-progress';
import { TableView } from './table-view';

export type ProgressSeries = { id: string; name: string; color: string; points: ProgressPoint[] };

/**
 * 읽기 진도 선 그래프. 가로축 = 주차. 퍼센트(0~100) / 쪽수(0~총 쪽수, 완독선) 토글, 기본은 퍼센트(선택은 기억하지 않는다).
 * 입력 없는 주는 점이 없고 입력된 점끼리 이어진다. 총 쪽수가 없으면 쪽수만 보인다.
 * 책 상세(내 선 하나)와 대시보드(멤버별 선)가 같이 쓴다.
 */
export function ProgressChart({ series, weeks, totalPages, caption }: { series: ProgressSeries[]; weeks: number[]; totalPages: number | null; caption: string }) {
  const [picked, setMode] = useState<ChartMode>('percent');
  const mode: ChartMode = totalPages ? picked : 'pages';
  const data = seriesRows(weeks, series, mode);
  const unit = mode === 'percent' ? '%' : '쪽';
  const single = series.length === 1;

  return (
    <figure>
      {totalPages ? (
        <div role="group" aria-label="표시 단위" className="mb-2 flex gap-2">
          {(['percent', 'pages'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 rounded-full border px-4 text-sm ${mode === m ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
            >
              {m === 'percent' ? '퍼센트' : '쪽수'}
            </button>
          ))}
        </div>
      ) : null}
      <div role="img" aria-label={`${caption}. 아래 표로 보기에 같은 값이 있어요`} className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 224 }}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" type="number" domain={[Math.min(...weeks), Math.max(...weeks)]} ticks={weeks} allowDecimals={false} tickFormatter={(v) => `${v}주`} tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--line)" padding={{ left: 12, right: 12 }} />
            <YAxis
              domain={mode === 'percent' ? [0, 100] : [0, totalPages ?? 'auto']}
              ticks={mode === 'percent' ? [0, 25, 50, 75, 100] : undefined}
              tickFormatter={(v) => `${v}${mode === 'percent' ? '%' : ''}`}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              stroke="var(--line)"
            />
            {mode === 'pages' && totalPages ? <ReferenceLine y={totalPages} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: '완독', position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 12 }} /> : null}
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--ink)' }}
              labelFormatter={(v) => `${v}주차`}
              formatter={(v, name) => [`${v}${unit}`, single ? '읽은 양' : String(name)]}
            />
            {!single && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />}
            {series.map((s) => (
              <Line key={s.id} name={s.name} dataKey={s.id} type="monotone" stroke={s.color} strokeWidth={2} connectNulls dot={{ r: 5, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 7 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView
        caption={caption}
        head={['주차', ...series.map((s) => s.name)]}
        rows={weeks.map((w, i) => [`${w}주차`, ...series.map((s) => (data[i]?.[s.id] === undefined ? '—' : `${data[i]![s.id]}${unit}`))])}
      />
    </figure>
  );
}
