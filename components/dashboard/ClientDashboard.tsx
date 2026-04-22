'use client'
import { useEffect, useRef, useState } from 'react'
import type { Client, Scan, Fix, Activity, KpiDefinition, KpiValue } from '@/types'
import { scoreToGrade } from '@/types'

interface Props {
  client: Client | null
  latestScan: Scan | null
  previousScan: Scan | null
  scanHistory: Scan[]
  fixes: Fix[]
  activity: Activity[]
  kpiDefs: KpiDefinition[]
  kpiValues: KpiValue[]
}

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--ga)', B: 'var(--gb)', C: 'var(--gc)', D: 'var(--gd)', F: 'var(--red)',
}
const GRADE_HEX: Record<string, string> = {
  A: '#2EC4B6', B: '#3A86FF', C: '#F5A623', D: '#E8634A', F: '#E74C3C',
}
const GRADE_BAR: Record<string, string> = {
  A: 'linear-gradient(90deg, #2EC4B6, #5DD9CF)',
  B: 'linear-gradient(90deg, #3A86FF, #7EB4FF)',
  C: 'linear-gradient(90deg, #F5A623, #FFCA6A)',
  D: 'linear-gradient(90deg, #E8634A, #F08A78)',
  F: 'linear-gradient(90deg, #E74C3C, #F08A78)',
}
const CAT_WEIGHT: Record<string, string> = {
  reviews: '25%', website: '20%', social: '20%', local_seo: '15%', press: '10%', competitors: '10%',
}

function gc(grade: string) { return GRADE_COLOR[grade?.[0]] || 'var(--tx3)' }
function gh(grade: string) { return GRADE_HEX[grade?.[0]] || '#4A5A7A' }
function gb(grade: string) { return GRADE_BAR[grade?.[0]] || GRADE_BAR.D }

export default function ClientDashboard({
  client, latestScan, previousScan, scanHistory, fixes, activity, kpiDefs, kpiValues,
}: Props) {
  const arcRef = useRef<HTMLCanvasElement>(null)
  const trendRef = useRef<HTMLCanvasElement>(null)
  const [barsReady, setBarsReady] = useState(false)

  const score = latestScan?.overall_score ?? 0
  const grade = latestScan?.overall_grade ?? '—'
  const prevScore = previousScan?.overall_score ?? score
  const delta = score - prevScore

  const onboardingScore = scanHistory[scanHistory.length - 1]?.overall_score ?? score
  const totalDelta = score - onboardingScore

  const doneCount = fixes.filter(f => f.status === 'done').length
  const inProgressCount = fixes.filter(f => f.status === 'in_progress').length
  const pendingCount = fixes.filter(f => f.status === 'pending').length

  // Animate bars on mount
  useEffect(() => { const t = setTimeout(() => setBarsReady(true), 300); return () => clearTimeout(t) }, [])

  // ── ARC CHART (Chart.js doughnut) ──
  useEffect(() => {
    const canvas = arcRef.current
    if (!canvas || !score) return
    let destroyed = false
    import('chart.js').then(({ Chart, DoughnutController, ArcElement }) => {
      if (destroyed) return
      Chart.register(DoughnutController, ArcElement)
      const existing = Chart.getChart(canvas)
      if (existing) existing.destroy()
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [score, 100 - score],
            backgroundColor: [gh(grade), 'rgba(255,255,255,0.05)'],
            borderWidth: 0, borderRadius: 4,
          }, {
            data: [90, 10],
            backgroundColor: [`${gh(grade)}20`, 'transparent'],
            borderWidth: 0,
          }],
        },
        options: {
          cutout: '72%', rotation: -90, circumference: 360, responsive: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          animation: { duration: 1200, easing: 'easeOutQuart' },
        },
      })
    })
    return () => { destroyed = true }
  }, [score, grade])

  // ── TREND CHART (Chart.js line) ──
  useEffect(() => {
    const canvas = trendRef.current
    if (!canvas || scanHistory.length < 2) return
    let destroyed = false
    import('chart.js').then(({ Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip }) => {
      if (destroyed) return
      Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)
      const existing = Chart.getChart(canvas)
      if (existing) existing.destroy()
      const sorted = [...scanHistory].reverse()
      const labels = sorted.map(s => new Date(s.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      const data = sorted.map(s => s.overall_score)
      const start = data[0] || 50
      const targetData = data.map((_, i) => Math.round(start + (90 - start) * (i / Math.max(data.length - 1, 1))))
      new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Overall Score', data,
            borderColor: '#2EC4B6', backgroundColor: 'rgba(46,196,182,0.08)',
            fill: true, tension: 0.4, borderWidth: 2,
            pointRadius: 3, pointBackgroundColor: '#2EC4B6', pointBorderWidth: 0,
          }, {
            label: 'Target Path', data: targetData,
            borderColor: 'rgba(46,196,182,0.25)', borderDash: [4, 4],
            borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0D1526', borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1, titleColor: '#F0F4FF', bodyColor: '#8A9BBD', padding: 10,
            },
          },
          scales: {
            y: { min: 50, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { family: 'DM Mono', size: 10 } } },
            x: { grid: { display: false }, ticks: { color: '#4A5A7A', font: { family: 'DM Mono', size: 10 } } },
          },
        },
      })
    })
    return () => { destroyed = true }
  }, [scanHistory])

  const categories = [
    { key: 'website', label: 'Website', emoji: '🌐', score: latestScan?.website_score, grade: latestScan?.website_grade, prev: previousScan?.website_score },
    { key: 'social', label: 'Social Media', emoji: '📱', score: latestScan?.social_score, grade: latestScan?.social_grade, prev: previousScan?.social_score },
    { key: 'reviews', label: 'Reviews', emoji: '⭐', score: latestScan?.reviews_score, grade: latestScan?.reviews_grade, prev: previousScan?.reviews_score },
    { key: 'local_seo', label: 'Local SEO', emoji: '📍', score: latestScan?.local_seo_score, grade: latestScan?.local_seo_grade, prev: previousScan?.local_seo_score },
    { key: 'press', label: 'News & Press', emoji: '📰', score: latestScan?.press_score, grade: latestScan?.press_grade, prev: previousScan?.press_score },
    { key: 'competitors', label: 'vs. Competitors', emoji: '🏁', score: latestScan?.competitor_score, grade: latestScan?.competitor_grade, prev: previousScan?.competitor_score },
  ]

  const sortedFixes = [...fixes].sort((a, b) => {
    const ord = { done: 0, in_progress: 1, pending: 2, skipped: 3 }
    return (ord[a.status] ?? 9) - (ord[b.status] ?? 9)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.4s ease both' }}>

      {/* ════════ SCORE HERO ════════ */}
      <div style={{
        background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 16,
        padding: 28, display: 'grid', gridTemplateColumns: 'auto 1fr auto',
        gap: 28, alignItems: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280,
          background: 'radial-gradient(circle, var(--td) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Arc chart */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
          <canvas ref={arcRef} width={140} height={140} style={{ position: 'absolute', top: 0, left: 0 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '2.75rem', fontWeight: 800,
              color: gc(grade), lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--tx3)', fontWeight: 500, marginTop: 2 }}>{score}/100</div>
          </div>
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--tx3)', marginBottom: 4 }}>Overall Digital Grade</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--tx)', marginBottom: 6 }}>{client?.name}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--tx2)', marginBottom: 16 }}>
            {client?.locations?.length || 0} location{(client?.locations?.length || 0) !== 1 ? 's' : ''}
            {client?.industry ? ` · ${client.industry}` : ''}
            {client?.locations?.length ? ` · ${client.locations.map(l => l.city).join(' · ')}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {totalDelta !== 0 && <Pill color={totalDelta >= 0 ? 'teal' : 'red'}>
              {totalDelta >= 0 ? '↑' : '↓'} {totalDelta >= 0 ? '+' : ''}{totalDelta} pts since onboarding
            </Pill>}
            {delta !== 0 && <Pill color={delta >= 0 ? 'teal' : 'red'}>
              {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta} pts this week
            </Pill>}
            <Pill color="neutral">Target: A (90) by Mar 2027</Pill>
          </div>
        </div>

        {/* Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
          <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--tx3)', marginBottom: 4 }}>Path to 100</div>
          {[
            { label: 'Onboarding baseline', grade: scoreToGrade(onboardingScore), done: true },
            { label: 'Month 1 · Quick wins', grade: 'C', done: score >= 65, active: score >= 50 && score < 65 },
            { label: 'Month 3 · Systems live', grade: 'C+', done: score >= 74, active: score >= 65 && score < 74 },
            { label: 'Month 12 · Full stack', grade: 'A', done: score >= 90, active: score >= 74 && score < 90 },
          ].map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: m.done ? 'var(--teal)' : m.active ? 'var(--yellow)' : 'var(--n5)',
                boxShadow: m.active ? '0 0 8px var(--yellow)' : 'none',
                border: !m.done && !m.active ? '1px solid var(--b2)' : 'none',
              }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--tx2)', flex: 1 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '0.875rem', fontWeight: 700,
                color: m.done ? 'var(--teal)' : m.active ? 'var(--yellow)' : 'var(--tx3)' }}>
                {m.grade}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ CATEGORY SCORES ════════ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: 'var(--tx)' }}>
            Category Scores
          </div>
          <a style={{ fontSize: '0.75rem', color: 'var(--teal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            View full breakdown →
          </a>
        </div>
        <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {categories.map(cat => {
            const s = cat.score ?? 0
            const g = cat.grade ?? scoreToGrade(s)
            const catDelta = cat.prev != null ? s - cat.prev : 0
            const catFixes = fixes.filter(f => f.category === cat.key)
            const done = catFixes.filter(f => f.status === 'done').length
            const active = catFixes.filter(f => f.status === 'in_progress').length
            const target = Math.min(100, s + catFixes.filter(f => f.status !== 'done').reduce((sum, f) => sum + f.score_impact, 0))

            return (
              <div key={cat.key} className="cat-card" style={{
                background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
                padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {/* Top: icon + grade */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: '1.25rem' }}>{cat.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--tx)' }}>{cat.label}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)', marginTop: 2 }}>{CAT_WEIGHT[cat.key]} of overall</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: gc(g) }}>{g}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)', marginTop: 2, fontFamily: 'var(--fm)' }}>{s} → {target}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 5, background: 'var(--n4)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{
                      height: '100%', borderRadius: 999, background: gb(g),
                      width: barsReady ? `${s}%` : '0%',
                      transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
                    <span>0</span><span>Target: {target}</span>
                  </div>
                </div>

                {/* Delta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600,
                  color: catDelta > 0 ? 'var(--teal)' : catDelta < 0 ? 'var(--red)' : 'var(--tx3)' }}>
                  {catDelta > 0 ? `↑ +${catDelta} pts this week` : catDelta < 0 ? `↓ ${catDelta} pts this week` : '→ No change this week'}
                </div>

                {/* Fixes row */}
                {catFixes.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {catFixes.slice(0, 4).map((fix, i) => (
                        <span key={fix.id || i} style={{
                          fontSize: '0.625rem', fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          ...(fix.status === 'done' ? { background: 'rgba(46,196,182,0.12)', color: 'var(--teal)', border: '1px solid rgba(46,196,182,0.2)' }
                            : fix.status === 'in_progress' ? { background: 'rgba(245,166,35,0.12)', color: 'var(--yellow)', border: '1px solid rgba(245,166,35,0.2)' }
                            : { background: 'var(--n4)', color: 'var(--tx3)', border: '1px solid var(--b)' }),
                        }}>
                          {fix.name?.split(' ').slice(0, 2).join(' ')}{fix.status === 'done' ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--tx3)' }}>{done}/{catFixes.length} done</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════ BOTTOM ROW ════════ */}
      <div className="bottom-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 20 }}>

        {/* ── KPI Panel ── */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: 'var(--tx)' }}>Custom KPIs</div>
            <a style={{ fontSize: '0.75rem', color: 'var(--teal)', cursor: 'pointer' }}>+ Add KPI</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {kpiDefs.slice(0, 6).map(kpi => {
              const vals = kpiValues.filter(v => v.kpi_id === kpi.id)
                .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
              const latest = vals[0]?.value
              const prev = vals[1]?.value
              const kDelta = latest != null && prev != null ? latest - prev : null
              const formatted = latest != null
                ? (kpi.unit === 'rating' || kpi.unit === '★' ? `${latest}★` : latest >= 10000 ? `${(latest/1000).toFixed(1)}K` : latest.toLocaleString())
                : '—'

              return (
                <div key={kpi.id} style={{
                  background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8, padding: 14,
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tx3)', marginBottom: 6 }}>{kpi.name}</div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--tx)', lineHeight: 1, marginBottom: 4 }}>{formatted}</div>
                  {kDelta != null ? (
                    <div style={{ fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4,
                      color: kDelta >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                      {kDelta >= 0 ? '↑' : '↓'} {kDelta >= 0 ? '+' : ''}{Math.abs(kDelta).toLocaleString()} this week
                    </div>
                  ) : latest == null ? (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--yellow)' }}>⚡ In progress</div>
                  ) : kpi.target ? (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)' }}>Target: {kpi.target}</div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Score Trend + Activity ── */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: 'var(--tx)' }}>Overall Score Trend</div>
            <a style={{ fontSize: '0.75rem', color: 'var(--teal)', cursor: 'pointer' }}>Weekly ▾</a>
          </div>
          <div style={{ height: 200, marginBottom: 14 }}>
            <canvas ref={trendRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Activity Feed */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 10 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activity.slice(0, 5).map((a, i) => (
                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: i < Math.min(activity.length, 5) - 1 ? '1px solid var(--b)' : 'none' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: a.type === 'fix_done' || a.type === 'kpi_update' ? 'var(--teal)'
                      : a.type === 'scan_complete' || a.type === 'report_sent' ? 'var(--blue)'
                      : a.type === 'fix_started' ? 'var(--yellow)' : 'var(--tx3)',
                    boxShadow: a.type === 'fix_done' ? '0 0 8px var(--tg)' : 'none',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--tx2)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--tx)', fontWeight: 600 }}>{a.title}</strong>
                      {a.description ? ` — ${a.description}` : ''}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)', marginTop: 2, fontFamily: 'var(--fm)' }}>
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{new Date(a.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Fix Progress ── */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 700, color: 'var(--tx)' }}>Fix Progress</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>{inProgressCount} active</span>
          </div>

          {/* Summary pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.6875rem', background: 'var(--td)', color: 'var(--teal)',
              border: '1px solid rgba(46,196,182,0.2)', padding: '4px 10px', borderRadius: 999, fontWeight: 600 }}>
              {doneCount} done
            </div>
            <div style={{ fontSize: '0.6875rem', background: 'rgba(245,166,35,0.1)', color: 'var(--yellow)',
              border: '1px solid rgba(245,166,35,0.2)', padding: '4px 10px', borderRadius: 999, fontWeight: 600 }}>
              {inProgressCount} in progress
            </div>
            <div style={{ fontSize: '0.6875rem', background: 'var(--n4)', color: 'var(--tx3)',
              border: '1px solid var(--b)', padding: '4px 10px', borderRadius: 999, fontWeight: 600 }}>
              {pendingCount} pending
            </div>
          </div>

          {/* Fix list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
            {sortedFixes.map(fix => (
              <div key={fix.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8,
                transition: 'border-color 0.2s', cursor: 'pointer',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.875rem', flexShrink: 0, marginTop: 1,
                  background: fix.status === 'done' ? 'var(--td)'
                    : fix.status === 'in_progress' ? 'rgba(245,166,35,0.12)' : 'var(--n4)',
                }}>
                  {fix.status === 'done' ? '✓' : fix.status === 'in_progress' ? '⟳' : '·'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)', marginBottom: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fix.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)' }}>
                    {fix.category?.replace('_', ' ')}{fix.score_impact > 0 ? ` · +${fix.score_impact} pts` : ''}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '3px 8px', borderRadius: 999, flexShrink: 0, alignSelf: 'flex-start',
                  ...(fix.status === 'done' ? { background: 'var(--td)', color: 'var(--teal)' }
                    : fix.status === 'in_progress' ? { background: 'rgba(245,166,35,0.12)', color: 'var(--yellow)' }
                    : { background: 'var(--n4)', color: 'var(--tx3)' }),
                }}>
                  {fix.status === 'in_progress' ? 'In Progress' : fix.status === 'done' ? 'Done' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ RESPONSIVE + ANIMATIONS ════════ */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cat-card:hover {
          border-color: var(--b2) !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        @media (max-width: 1300px) {
          .bottom-row { grid-template-columns: 1fr 1fr !important; }
          .bottom-row > *:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 1200px) {
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 900px) {
          .bottom-row { grid-template-columns: 1fr !important; }
          .bottom-row > *:last-child { grid-column: auto; }
        }
        @media (max-width: 800px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: auto 1fr auto"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: 'teal' | 'red' | 'neutral' }) {
  const styles = {
    teal: { color: 'var(--teal)', border: 'rgba(46,196,182,0.3)', bg: 'var(--td)' },
    red: { color: 'var(--red)', border: 'rgba(232,99,74,0.3)', bg: 'rgba(232,99,74,0.1)' },
    neutral: { color: 'var(--tx2)', border: 'var(--b)', bg: 'var(--n3)' },
  }[color]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600,
      padding: '5px 12px', borderRadius: 999, border: `1px solid ${styles.border}`,
      background: styles.bg, color: styles.color,
    }}>{children}</div>
  )
}
