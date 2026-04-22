'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardShell from '@/components/dashboard/DashboardShell'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import ClientDashboard from '@/components/dashboard/ClientDashboard'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [allClients, setAllClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: prof } = await supabase
          .from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)

        if (prof?.role === 'client' && prof.client_id) {
          const { data: c } = await supabase
            .from('clients').select('*').eq('id', prof.client_id).single()
          setClient(c)
        }

        if (prof?.role === 'admin') {
          const { data: clients } = await supabase
            .from('clients').select('*').order('created_at', { ascending: false })
          setAllClients(clients || [])
        }

        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: 'var(--tx)' }}>
        Loading...
      </div>
    )
  }

  if (!profile) return null

  return (
    <DashboardShell profile={profile} client={client} allClients={allClients}>
      {profile.role === 'admin' ? (
        <AdminDashboardWrapper clients={allClients} />
      ) : (
        <ClientDashboardWrapper clientId={profile.client_id} />
      )}
    </DashboardShell>
  )
}

function AdminDashboardWrapper({ clients }: { clients: any[] }) {
  const [clientsWithScans, setClientsWithScans] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const withScans = await Promise.all(
        clients.map(async (c) => {
          const { data: scans } = await supabase
            .from('scans').select('overall_score,overall_grade,scanned_at')
            .eq('client_id', c.id).eq('status', 'complete')
            .order('scanned_at', { ascending: false }).limit(2)
          return {
            ...c,
            latest_scan: scans?.[0] || null,
            score_delta: scans?.[0] && scans?.[1] ? scans[0].overall_score - scans[1].overall_score : null,
          }
        })
      )
      setClientsWithScans(withScans)
    }
    if (clients.length) load()
  }, [clients])

  return <AdminDashboard clients={clientsWithScans} />
}

function ClientDashboardWrapper({ clientId }: { clientId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const [c, s, f, a, k] = await Promise.all([
          supabase.from('clients').select('*').eq('id', clientId).single(),
          supabase.from('scans').select('*').eq('client_id', clientId)
            .eq('status', 'complete').order('scanned_at', { ascending: false }).limit(10),
          supabase.from('fixes').select('*').eq('client_id', clientId)
            .order('sort_order', { ascending: true }),
          supabase.from('activity').select('*').eq('client_id', clientId)
            .order('created_at', { ascending: false }).limit(10),
          supabase.from('kpi_definitions').select('*').eq('client_id', clientId)
            .order('sort_order', { ascending: true }),
        ])

        const kpiValues = k.data?.length ? (
          await supabase.from('kpi_values').select('*')
            .eq('client_id', clientId)
            .in('kpi_id', k.data.map(x => x.id))
            .order('recorded_at', { ascending: false })
            .limit(200)
        ).data : []

        setData({
          client: c.data,
          scans: s.data || [],
          fixes: f.data || [],
          activity: a.data || [],
          kpiDefs: k.data || [],
          kpiValues: kpiValues || [],
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  if (loading) return <div style={{ color: 'var(--tx)' }}>Loading dashboard...</div>
  if (!data) return <div style={{ color: 'var(--red)' }}>Error loading dashboard</div>

  return (
    <ClientDashboard
      client={data.client}
      latestScan={data.scans[0] || null}
      previousScan={data.scans[1] || null}
      scanHistory={data.scans}
      fixes={data.fixes}
      activity={data.activity}
      kpiDefs={data.kpiDefs}
      kpiValues={data.kpiValues}
    />
  )
}