'use client'
import { useEffect, useRef } from 'react'
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
  A: 'var(--ga)', B: 'var(--gb)', C: 'var(--gc)', D: 'var(--gd)', F: 'var(--red)'
}
const CAT_WEIGHT: Record<string, string> = {
  reviews: '25%', website: '20%', social: '20%', local_seo: '15%', press: '10%', competitors: '10%'
}

function gradeColor(grade: string) {
  return GRADE_COLOR[grade?.[0]] || 'var(--tx3)'
}

export default function ClientDashboard({
  client, latestScan, previousScan, scanHistory, fixes, activity, kpiDefs, kpiValues
}: Props) {
  const arcRef = useRef<HTMLCanvasElement>(null)
  const trendRef = useRef<HTMLCanvasElement>(null)

  const score = latestScan?.overall_score ?? 0
  const grade = latestScan?.overall_grade ?? '—'
  const prevScore = previousScan?.overall_score ?? score
  const delta = score - prevScore

  const onboardingScore = scanHistory[scanHistory.length - 1]?.overall_score ?? score
  const totalDelta = score - onboardingScore

  const doneCount = fixes.filter(f => f.status === 'done').length
  const inProgressCount = fixes.filter(f => f.status === 'in_progress').length
  const pendingCount = fixes.filter(f => f.status === 'pending').length

  // Draw arc chart
  useEffect(() => {
    const canvas = arcRef.current
    if (!canvas || !score) return
    const ctx = canvas.getContext('2d')!
    const cx = 70, cy = 70, r = 55, lw = 10
    ctx.clearRect(0, 0, 140, 140)
    // Background track
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, Math.PI*1.5)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke()
    // Target arc (faint)
    const targetAngle = -Math.PI/2 + (Math.PI*2 * 90/100)
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, targetAngle)
    ctx.strokeStyle = 'rgba(46,196,182,0.15)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke()
    // Score arc
    const scoreAngle = -Math.PI/2 + (Math.PI*2 * score/100)
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI/2, scoreAngle)
    ctx.strokeStyle = gradeColor(grade); ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke()
  }, [score, grade])

  // Draw trend chart
  useEffect(() => {
    const canvas = trendRef.current
    if (!canvas || scanHistory.length < 2) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.offsetWidth || 400, h = 160
    canvas.width = w; canvas.height = h
    const scores = [...scanHistory].reverse().map(s => s.overall_score)
    const min = Math.max(0, Math.min(...scores) - 10)
    const max = Math.min(100, Math.max(...scores) + 10)
    const pad = { l: 30, r: 20, t: 10, b: 25 }
    const chartW = w - pad.l - pad.r
    const chartH = h - pad.t - pad.b
    const xStep = chartW / (scores.length - 1)
    const yScale = (v: number) => pad.t + chartH - ((v - min) / (max - min)) * chartH
    const xScale = (i: number) => pad.l + i * xStep
    ctx.clearRect(0, 0, w, h)
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (chartH / 4) * g
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke()
    }
    // Fill gradient
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b)
    grad.addColorStop(0, 'rgba(46,196,182,0.2)'); grad.addColorStop(1, 'rgba(46,196,182,0)')
    ctx.beginPath(); ctx.moveTo(xScale(0), yScale(scores[0]))
    for (let i = 1; i < scores.length; i++) ctx.lineTo(xScale(i), yScale(scores[i]))
    ctx.lineTo(xScale(scores.length-1), h-pad.b); ctx.lineTo(xScale(0), h-pad.b)
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill()
    // Line
    ctx.beginPath(); ctx.strokeStyle = '#2EC4B6'; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    scores.forEach((s, i) => i === 0 ? ctx.moveTo(xScale(i), yScale(s)) : ctx.lineTo(xScale(i), yScale(s)))
    ctx.stroke()
    // Dots
    scores.forEach((s, i) => {
      ctx.beginPath(); ctx.arc(xScale(i), yScale(s), 3, 0, Math.PI*2)
      ctx.fillStyle = '#2EC4B6'; ctx.fill()
    })
  }, [scanHistory])

  const categories = [
    { key: 'website',     label: 'Website',         emoji: '🌐', score: latestScan?.website_score,     grade: latestScan?.website_grade },
    { key: 'social',      label: 'Social Media',     emoji: '📱', score: latestScan?.social_score,      grade: latestScan?.social_grade },
    { key: 'reviews',     label: 'Reviews',          emoji: '⭐', score: latestScan?.reviews_score,     grade: latestScan?.reviews_grade },
    { key: 'local_seo',   label: 'Local SEO',        emoji: '📍', score: latestScan?.local_seo_score,   grade: latestScan?.local_seo_grade },
    { key: 'press',       label: 'News & Press',     emoji: '📰', score: latestScan?.press_score,       grade: latestScan?.press_grade },
    { key: 'competitors', label: 'vs. Competitors',  emoji: '🏁', score: latestScan?.competitor_score,  grade: latestScan?.competitor_grade },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Score Hero */}
      <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 16,
        padding: 24, display: 'grid', gridTemplateColumns: '140px 1fr auto',
        gap: 22, alignItems: 'start', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          background: 'radial-gradient(circle,rgba(46,196,182,0.1),transparent 70%)', pointerEvents: 'none' }} />

        {/* Arc */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
          <canvas ref={arcRef} width={140} height={140}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '2.75rem', fontWeight: 800,
              color: gradeColor(grade), lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)', marginTop: 2 }}>{score}/100</div>
          </div>
        </div>

        {/* Info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--tx3)', marginBottom: 3 }}>Overall Digital Grade</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.375rem', fontWeight: 700,
            color: 'var(--tx)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis' }}>{client?.name}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--tx2)', marginBottom: 12 }}>
            {client?.locations?.map(l => l.city).join(' · ')} · {client?.industry}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {totalDelta !== 0 && (
              <Pill color={totalDelta >= 0 ? 'teal' : 'red'}>
                {totalDelta >= 0 ? '↑' : '↓'} {Math.abs(totalDelta)} pts since onboarding
              </Pill>
            )}
            {delta !== 0 && (
              <Pill color={delta >= 0 ? 'teal' : 'red'}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} pts this week
              </Pill>
            )}
            <Pill color="neutral">Target: A (90) by Mar 2027</Pill>
          </div>
        </div>

        {/* Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 180 }}>
          <div style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--tx3)', marginBottom: 2 }}>Path to 100</div>
          {[
            { label: 'Baseline', grade: scoreToGrade(onboardingScore), done: true },
            { label: 'Month 1 · Quick wins', grade: 'C', done: score >= 65, active: score < 65 },
            { label: 'Month 3 · Systems', grade: 'C+', done: score >= 74, active: score >= 65 && score < 74 },
            { label: 'Month 12 · Full stack', grade: 'A', done: score >= 90, active: score >= 74 },
          ].map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px',
              background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: m.done ? 'var(--teal)' : m.active ? 'var(--yellow)' : 'var(--n5)',
                boxShadow: m.active ? '0 0 5px var(--yellow)' : 'none' }} />
              <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--tx2)' }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '0.875rem', fontWeight: 700,
                color: m.done ? 'var(--teal)' : m.active ? 'var(--yellow)' : 'var(--tx3)' }}>
                {m.grade}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Scores */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tx)' }}>
            Category Scores
          </div>
          {latestScan && (
            <div style={{ fontSize: '0.75rem', color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
              Last scan: {new Date(latestScan.scanned_at).toLocaleDateString()}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11 }}>
          {categories.map(cat => (
            <CatCard key={cat.key} {...cat}
              weight={CAT_WEIGHT[cat.key]}
              fixes={fixes.filter(f => f.category === cat.key)} />
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 350px', gap: 14, minWidth: 0 }}>

        {/* KPIs */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 16, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tx)' }}>
              Custom KPIs
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {kpiDefs.map(kpi => {
              const vals = kpiValues.filter(v => v.kpi_id === kpi.id)
                .sort((a,b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
              const latest = vals[0]?.value
              const prev = vals[1]?.value
              const kDelta = latest != null && prev != null ? latest - prev : null
              return (
                <div key={kpi.id} style={{ background: 'var(--n3)', border: '1px solid var(--b)',
                  borderRadius: 8, padding: 11, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--tx3)', marginBottom: 4 }}>{kpi.name}</div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700,
                    color: 'var(--tx)', lineHeight: 1, marginBottom: 2 }}>
                    {latest != null ? latest.toLocaleString() : '—'}
                    {kpi.unit === 'rating' && latest ? '★' : ''}
                  </div>
                  {kDelta != null && (
                    <div style={{ fontSize: '0.625rem', color: kDelta >= 0 ? 'var(--teal)' : 'var(--red)' }}>
                      {kDelta >= 0 ? '↑' : '↓'} {Math.abs(kDelta).toLocaleString()} vs. last week
                    </div>
                  )}
                  {latest == null && (
                    <div style={{ fontSize: '0.625rem', color: 'var(--yellow)' }}>⚡ No data yet</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Trend + Activity */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 16, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem',
            color: 'var(--tx)', marginBottom: 12 }}>Score Trend</div>
          <div style={{ height: 160, width: '100%', position: 'relative' }}>
            <canvas ref={trendRef} style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.875rem',
              color: 'var(--tx)', marginBottom: 8 }}>Recent Activity</div>
            {activity.slice(0, 4).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 9, padding: '8px 0',
                borderBottom: '1px solid var(--b)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                  background: a.type === 'scan_complete' ? 'var(--blue)'
                    : a.type.includes('fix') ? 'var(--teal)' : 'var(--yellow)' }} />
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--tx2)', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--tx)', fontWeight: 600 }}>{a.title}</strong>
                    {a.description ? ` — ${a.description}` : ''}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--tx3)', fontFamily: 'var(--fm)',
                    marginTop: 1 }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                    {' · '}{new Date(a.created_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fix Progress */}
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 16, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tx)' }}>
              Fix Progress
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--teal)' }}>{inProgressCount} active</div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              background: 'var(--td)', color: 'var(--teal)', border: '1px solid rgba(46,196,182,0.2)' }}>
              {doneCount} done
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              background: 'rgba(245,166,35,0.1)', color: 'var(--yellow)', border: '1px solid rgba(245,166,35,0.2)' }}>
              {inProgressCount} in progress
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999,
              background: 'var(--n4)', color: 'var(--tx3)', border: '1px solid var(--b)' }}>
              {pendingCount} pending
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 380, overflowY: 'auto' }}>
            {fixes.map(fix => (
              <div key={fix.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7,
                padding: '8px 9px', background: 'var(--n3)', border: '1px solid var(--b)',
                borderRadius: 8, minWidth: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: 5, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0,
                  background: fix.status === 'done' ? 'var(--td)'
                    : fix.status === 'in_progress' ? 'rgba(245,166,35,0.12)' : 'var(--n4)' }}>
                  {fix.status === 'done' ? '✓' : fix.status === 'in_progress' ? '⟳' : '·'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fix.name}
                  </div>
                  <div style={{ fontSize: '0.5625rem', color: 'var(--tx3)' }}>
                    {fix.category.replace('_', ' ')} · +{fix.score_impact} pts
                  </div>
                </div>
                <div style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 999, flexShrink: 0,
                  background: fix.status === 'done' ? 'var(--td)'
                    : fix.status === 'in_progress' ? 'rgba(245,166,35,0.12)' : 'var(--n4)',
                  color: fix.status === 'done' ? 'var(--teal)'
                    : fix.status === 'in_progress' ? 'var(--yellow)' : 'var(--tx3)' }}>
                  {fix.status === 'in_progress' ? 'In Progress' : fix.status.charAt(0).toUpperCase() + fix.status.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function CatCard({ key: _k, label, emoji, score, grade, weight, fixes }: {
  key: string; label: string; emoji: string
  score?: number; grade?: string; weight?: string; fixes: Fix[]
}) {
  const s = score ?? 0
  const g = grade ?? scoreToGrade(s)
  const done = fixes.filter(f => f.status === 'done').length
  const inProg = fixes.filter(f => f.status === 'in_progress').length

  return (
    <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
      padding: 16, cursor: 'pointer', minWidth: 0, overflow: 'hidden', width: '100%',
      transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 11, gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: '1.0625rem', flexShrink: 0 }}>{emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--tx)' }}>{label}</div>
            <div style={{ fontSize: '0.5625rem', color: 'var(--tx3)' }}>{weight} of overall</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', fontWeight: 800,
            lineHeight: 1, color: gradeColor(g) }}>{g}</div>
          <div style={{ fontSize: '0.5625rem', color: 'var(--tx3)', fontFamily: 'var(--fm)' }}>
            {s}/100
          </div>
        </div>
      </div>
      <div style={{ height: 5, background: 'var(--n4)', borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${s}%`,
          background: `linear-gradient(90deg, ${gradeColor(g)}, ${gradeColor(g)}88)`,
          transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem',
        color: 'var(--tx3)', fontFamily: 'var(--fm)', marginBottom: 8 }}>
        <span>0</span><span>100</span>
      </div>
      {fixes.length > 0 && (
        <div style={{ paddingTop: 7, borderTop: '1px solid var(--b)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {done > 0 && <span style={{ fontSize: '0.5rem', fontWeight: 700, padding: '2px 6px',
              borderRadius: 999, background: 'var(--td)', color: 'var(--teal)',
              border: '1px solid rgba(46,196,182,0.2)' }}>{done} done</span>}
            {inProg > 0 && <span style={{ fontSize: '0.5rem', fontWeight: 700, padding: '2px 6px',
              borderRadius: 999, background: 'rgba(245,166,35,0.12)', color: 'var(--yellow)',
              border: '1px solid rgba(245,166,35,0.2)' }}>{inProg} active</span>}
          </div>
          <span style={{ fontSize: '0.625rem', color: 'var(--tx3)' }}>{done}/{fixes.length}</span>
        </div>
      )}
    </div>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: 'teal'|'red'|'neutral' }) {
  const colors = {
    teal: { color: 'var(--teal)', border: 'rgba(46,196,182,0.3)', bg: 'var(--td)' },
    red:  { color: 'var(--red)',  border: 'rgba(232,99,74,0.3)',   bg: 'rgba(232,99,74,0.1)' },
    neutral: { color: 'var(--tx2)', border: 'var(--b)', bg: 'var(--n3)' },
  }[color]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600,
      padding: '4px 9px', borderRadius: 999, border: `1px solid ${colors.border}`,
      background: colors.bg, color: colors.color }}>
      {children}
    </div>
  )
}
