'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Client, Scan, Fix, Activity, KpiDefinition, KpiValue } from '@/types'
import ClientDashboard from '@/components/dashboard/ClientDashboard'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [fixes, setFixes] = useState<Fix[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [kpiDefs, setKpiDefs] = useState<KpiDefinition[]>([])
  const [kpiValues, setKpiValues] = useState<KpiValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') { router.push('/dashboard'); return }

        const [c, s, f, a, k] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('scans').select('*').eq('client_id', clientId)
            .eq('status', 'complete').order('scanned_at', { ascending: false }).limit(10),
          supabase.from('fixes').select('*').eq('client_id', clientId)
            .order('sort_order', { ascending: true }),
          supabase.from('activity').select('*').eq('client_id', clientId)
            .order('created_at', { ascending: false }).limit(20),
          supabase.from('kpi_definitions').select('*').eq('client_id', clientId)
            .order('sort_order', { ascending: true }),
        ])

        if (c.error || !c.data) { setError('Client not found'); setLoading(false); return }

        const kpiVals = k.data?.length ? (
          await supabase.from('kpi_values').select('*')
            .eq('client_id', clientId)
            .in('kpi_id', k.data.map((x: KpiDefinition) => x.id))
            .order('recorded_at', { ascending: false }).limit(200)
        ).data : []

        setClient(c.data); setScans(s.data || []); setFixes(f.data || [])
        setActivity(a.data || []); setKpiDefs(k.data || []); setKpiValues(kpiVals || [])
      } catch (err) { console.error(err); setError('Failed to load client data') }
      finally { setLoading(false) }
    }
    load()
  }, [clientId, router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--tx2)' }}>Loading client data...</div>
  )

  if (error || !client) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <div style={{ color: 'var(--red)', fontSize: '0.9375rem', fontWeight: 600 }}>{error || 'Client not found'}</div>
      <button onClick={() => router.push('/dashboard')} style={{ background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8, padding: '8px 16px', color: 'var(--tx2)', fontFamily: 'var(--fb)', fontSize: '0.8125rem', cursor: 'pointer' }}>Back to Dashboard</button>
    </div>
  )

  return (
    <div>
      <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--tx3)', fontFamily: 'var(--fb)', fontSize: '0.8125rem', cursor: 'pointer', padding: 0, marginBottom: 14 }}>All Clients</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--tx)' }}>{client.name}</div>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 999, background: client.status === 'active' ? 'var(--td)' : 'rgba(245,166,35,0.1)', color: client.status === 'active' ? 'var(--teal)' : 'var(--yellow)', border: '1px solid ' + (client.status === 'active' ? 'rgba(46,196,182,0.2)' : 'rgba(245,166,35,0.2)') }}>{client.status}</span>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 999, background: 'var(--td)', color: 'var(--teal)', border: '1px solid rgba(46,196,182,0.2)' }}>{client.tier}</span>
        </div>
        <button onClick={() => { fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId }) }); alert('Scan started') }} style={{ background: 'var(--teal)', color: 'var(--navy)', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--fb)', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>Run Scan</button>
      </div>
      <ClientDashboard client={client} latestScan={scans[0] || null} previousScan={scans[1] || null} scanHistory={scans} fixes={fixes} activity={activity} kpiDefs={kpiDefs} kpiValues={kpiValues} />
    </div>
  )
}
