'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Scan } from '@/types'

interface ClientWithScan extends Client {
  latest_scan: Partial<Scan> | null
  score_delta: number | null
}

export default function AdminDashboard({ clients }: { clients: ClientWithScan[] }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.industry?.toLowerCase().includes(query.toLowerCase())
  )

  const active = clients.filter(c => c.status === 'active').length
  const avgScore = clients.length
    ? Math.round(clients.reduce((sum, c) => sum + (c.latest_scan?.overall_score || 0), 0) / clients.length)
    : 0

  function gradeColor(g?: string) {
    if (!g) return 'var(--tx3)'
    if (g[0] === 'A') return 'var(--ga)'
    if (g[0] === 'B') return 'var(--gb)'
    if (g[0] === 'C') return 'var(--gc)'
    return 'var(--gd)'
  }

  function runScan(clientId: string, e: React.MouseEvent) {
    e.stopPropagation()
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    alert('Scan started — results will appear in a few minutes.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Clients',    value: active,                accent: 'var(--teal)' },
          { label: 'Avg Overall Score', value: `${avgScore}/100`,     accent: 'var(--blue)' },
          { label: 'Total Clients',     value: clients.length,        accent: 'var(--yellow)' },
          { label: 'This Week Scans',   value: clients.filter(c => {
            const d = c.latest_scan?.scanned_at
            return d && (Date.now() - new Date(d).getTime()) < 7 * 24 * 60 * 60 * 1000
          }).length, accent: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--n2)', border: '1px solid var(--b)',
            borderRadius: 12, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.accent }} />
            <div style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--tx3)', marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.75rem', fontWeight: 800,
              color: 'var(--tx)', lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Client table */}
      <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--b)' }}>
          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--tx)' }}>
            All Clients
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--n3)',
              border: '1px solid var(--b)', borderRadius: 8, padding: '5px 11px' }}>
              <span style={{ color: 'var(--tx3)' }}>🔍</span>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search clients…"
                style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--tx)',
                  fontFamily: 'var(--fb)', fontSize: '0.8125rem', width: 160 }} />
            </div>
            <button onClick={() => router.push('/dashboard/clients/new')}
              style={{ background: 'var(--teal)', color: 'var(--navy)', border: 'none',
                borderRadius: 8, padding: '7px 14px', fontFamily: 'var(--fb)', fontSize: '0.8125rem',
                fontWeight: 700, cursor: 'pointer' }}>
              + Add Client
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                {['Client','Industry','Grade','Score','Trend','Tier','Last Scan','Status',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 16px', fontSize: '0.5625rem',
                    textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tx3)',
                    background: 'var(--n3)', borderBottom: '1px solid var(--b)', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const g = c.latest_scan?.overall_grade || '—'
                const s = c.latest_scan?.overall_score
                const delta = c.score_delta
                return (
                  <tr key={c.id} onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)',
                      fontWeight: 600, color: 'var(--tx)', fontSize: '0.875rem' }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)',
                      color: 'var(--tx3)', fontSize: '0.875rem' }}>{c.industry}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)',
                        fontSize: '0.6875rem', fontWeight: 800, border: '2px solid',
                        borderColor: gradeColor(g), color: gradeColor(g),
                        background: `${gradeColor(g)}22` }}>{g}</div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)',
                      fontFamily: 'var(--fm)', color: 'var(--tx)', fontSize: '0.875rem' }}>
                      {s != null ? `${s}/100` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)' }}>
                      {delta != null ? (
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600,
                          color: delta > 0 ? 'var(--teal)' : delta < 0 ? 'var(--red)' : 'var(--tx3)' }}>
                          {delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${delta}` : '→ 0'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)' }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 999,
                        background: 'var(--td)', color: 'var(--teal)',
                        border: '1px solid rgba(46,196,182,0.2)' }}>
                        {c.tier.charAt(0).toUpperCase() + c.tier.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)',
                      fontFamily: 'var(--fm)', fontSize: '0.8125rem', color: 'var(--tx3)' }}>
                      {c.latest_scan?.scanned_at
                        ? new Date(c.latest_scan.scanned_at as string).toLocaleDateString('en-US', { month:'short', day:'numeric' })
                        : 'Never'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)' }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 999,
                        background: c.status === 'active' ? 'var(--td)' : 'rgba(245,166,35,0.1)',
                        color: c.status === 'active' ? 'var(--teal)' : 'var(--yellow)',
                        border: `1px solid ${c.status === 'active' ? 'rgba(46,196,182,0.2)' : 'rgba(245,166,35,0.2)'}` }}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--b)' }}>
                      <button onClick={e => runScan(c.id, e)}
                        style={{ background: 'var(--n3)', border: '1px solid var(--b)',
                          borderRadius: 8, color: 'var(--tx2)', fontSize: '0.6875rem', fontWeight: 600,
                          padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--fb)',
                          transition: 'all 0.2s' }}>
                        Scan →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
