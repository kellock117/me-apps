'use client';

import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProgressHelpDialog } from '@/components/progress-help-dialog';
import { fmtPerDay } from '@/lib/format';
import { seriesRows, type ChartMode, type ProgressPoint } from '@/lib/reading-progress';

/** projection = 하루 평균으로 본 예상선의 점(projectionPoints). 비어 있으면 예상선을 그리지 않는다. */
export type ProgressSeries = { id: string; name: string; color: string; points: ProgressPoint[]; projection?: ProgressPoint[] };
/** 속도 표의 한 줄(멤버). 값은 쪽/일, 기록이 없으면 null("—"). */
export type SpeedRow = { id: string; name: string; color: string; average: number | null; recent: number | null; needed: number | null };
type View = ChartMode | 'speed';
const LABEL: Record<View, string> = { percent: '퍼센트', pages: '쪽수', speed: '속도' };
/** 예상선의 dataKey 꼬리표. 시리즈 id(멤버 uuid, 'me')와 겹치지 않는다. */
const PROJ = '__proj';

/**
 * 읽기 진도 선 그래프. 가로축 = 주차. 퍼센트(0~100) / 쪽수(0~총 쪽수, 완독선) 토글, 기본은 퍼센트(선택은 기억하지 않는다).
 * 입력 없는 주는 점이 없고 입력된 점끼리 이어진다. 총 쪽수가 없으면 퍼센트가 빠진다.
 * speeds를 넘기면(대시보드) "속도" 보기가 생긴다: 멤버별 하루 평균·최근 주·모임까지 하루 필요 표.
 * 시리즈에 projection이 있으면 같은 색 점선(점 없음)으로 예상선을 그린다. 범례 대신 그래프 아래 "점선 = 예상" 안내를 단다.
 * 퍼센트·쪽수 보기에서는 오른쪽 위 "?"가 계산 방식 모달을 연다.
 * 책 상세(내 선 하나)와 대시보드(멤버별 선)가 같이 쓴다.
 */
export function ProgressChart({ series, weeks, totalPages, caption, speeds }: { series: ProgressSeries[]; weeks: number[]; totalPages: number | null; caption: string; speeds?: SpeedRow[] }) {
  const views: View[] = [...(totalPages ? (['percent'] as const) : []), 'pages', ...(speeds ? (['speed'] as const) : [])];
  const [picked, setView] = useState<View>('percent');
  const view: View = views.includes(picked) ? picked : 'pages';
  const mode: ChartMode = view === 'speed' ? 'pages' : view;
  const projected = series.filter((s) => (s.projection?.length ?? 0) > 0);
  const data = seriesRows(weeks, [...series, ...projected.map((s) => ({ id: s.id + PROJ, points: s.projection! }))], mode);
  const unit = mode === 'percent' ? '%' : '쪽';
  const single = series.length === 1;
  const nameOf = (key: string) => {
    const s = series.find((x) => x.id === key.replace(PROJ, ''));
    const base = single ? '읽은 양' : (s?.name ?? key);
    return key.endsWith(PROJ) ? (single ? '예상' : `${base} (예상)`) : base;
  };

  return (
    <figure>
      <div className="mb-2 flex items-start justify-between gap-2">
        {views.length > 1 ? (
          <div role="group" aria-label="보기" className="flex flex-wrap gap-2">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`min-h-11 rounded-full border px-4 text-sm ${view === v ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}
              >
                {LABEL[v]}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        {view !== 'speed' && <ProgressHelpDialog />}
      </div>
      {view === 'speed' && speeds ? (
        <SpeedTable rows={speeds} />
      ) : (
        <div role="img" aria-label={caption} className="h-56 w-full">
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
              <Tooltip cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} content={(p) => <ChartTooltip active={p.active} label={p.label} payload={p.payload} unit={unit} nameOf={nameOf} />} />
              {!single && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />}
              {series.map((s) => (
                <Line key={s.id} name={s.name} dataKey={s.id} type="monotone" stroke={s.color} strokeWidth={2} connectNulls dot={{ r: 5, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 7 }} isAnimationActive={false} />
              ))}
              {projected.map((s) => (
                <Line key={s.id + PROJ} name={`${s.name} (예상)`} dataKey={s.id + PROJ} type="monotone" stroke={s.color} strokeWidth={2} strokeDasharray="5 4" strokeOpacity={0.8} connectNulls dot={false} activeDot={false} legendType="none" isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {view !== 'speed' && projected.length > 0 && (
        <figcaption className="mt-1 flex items-center gap-2 text-xs text-muted">
          <svg aria-hidden width="20" height="4" className="shrink-0">
            <line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" />
          </svg>
          점선은 하루 평균으로 본 예상이에요
        </figcaption>
      )}
    </figure>
  );
}

type TipItem = { dataKey?: unknown; value?: unknown; color?: string };

/**
 * 툴팁: 주차와 시리즈별 값. 예상선은 "(예상)"을 붙인다.
 * 예상선의 첫 점은 실제 마지막 기록과 같은 값이라, 같은 주차에 실제 값이 있으면 예상 쪽은 뺀다.
 */
function ChartTooltip({ active, label, payload, unit, nameOf }: { active?: boolean; label?: unknown; payload?: readonly TipItem[]; unit: string; nameOf: (key: string) => string }) {
  if (!active || !payload?.length) return null;
  const withValue = payload.filter((p) => p.value !== undefined && p.value !== null);
  const keys = new Set(withValue.map((p) => String(p.dataKey)));
  const items = withValue.filter((p) => {
    const key = String(p.dataKey);
    return !(key.endsWith(PROJ) && keys.has(key.slice(0, -PROJ.length)));
  });
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm">
      <p className="mb-1 font-medium">{String(label)}주차</p>
      <ul className="space-y-0.5 tabular-nums">
        {items.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted">{nameOf(String(p.dataKey))}</span>
            <span className="ml-auto pl-3">
              {String(p.value)}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 속도 보기: 행 = 멤버, 열 = 하루 평균 / 최근 주(하루) / 모임까지 하루 필요. 모두 쪽/일. */
function SpeedTable({ rows }: { rows: SpeedRow[] }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <caption className="sr-only">멤버별 읽기 속도(쪽/일)</caption>
      <thead>
        <tr className="border-b border-line text-xs text-muted">
          <th scope="col" className="py-2 text-left font-medium">멤버</th>
          <th scope="col" className="py-2 text-right font-medium">하루 평균</th>
          <th scope="col" className="py-2 text-right font-medium">최근 주</th>
          <th scope="col" className="py-2 text-right font-medium">모임까지 필요</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.id}>
            <th scope="row" className="py-2.5 text-left font-medium">
              <span aria-hidden className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: r.color }} />
              {r.name}
            </th>
            <td className="py-2.5 text-right">{fmtPerDay(r.average)}</td>
            <td className="py-2.5 text-right">{fmtPerDay(r.recent)}</td>
            <td className="py-2.5 text-right">{fmtPerDay(r.needed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
