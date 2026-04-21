import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientDashboard from '@/components/dashboard/ClientDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (profile?.role === 'admin') {
    // Fetch all clients with their latest scan
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    const clientsWithScans = await Promise.all(
      (clients || []).map(async (client) => {
        const { data: scans } = await supabase
          .from('scans')
          .select('overall_score,overall_grade,scanned_at')
          .eq('client_id', client.id)
          .eq('status', 'complete')
          .order('scanned_at', { ascending: false })
          .limit(2)

        return {
          ...client,
          latest_scan: scans?.[0] || null,
          previous_scan: scans?.[1] || null,
          score_delta: scans?.[0] && scans?.[1]
            ? scans[0].overall_score - scans[1].overall_score
            : null,
        }
      })
    )
    return <AdminDashboard clients={clientsWithScans} />
  }

  // Client view — fetch their data
  if (!profile?.client_id) redirect('/login')

  const [
    { data: client },
    { data: scans },
    { data: fixes },
    { data: activity },
    { data: kpiDefs },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', profile.client_id).single(),
    supabase.from('scans').select('*').eq('client_id', profile.client_id)
      .eq('status', 'complete').order('scanned_at', { ascending: false }).limit(10),
    supabase.from('fixes').select('*').eq('client_id', profile.client_id)
      .order('sort_order', { ascending: true }),
    supabase.from('activity').select('*').eq('client_id', profile.client_id)
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('kpi_definitions').select('*').eq('client_id', profile.client_id)
      .order('sort_order', { ascending: true }),
  ])

  // Fetch KPI values for the last 8 weeks
  const kpiValues = kpiDefs?.length ? (
    await supabase.from('kpi_values').select('*')
      .eq('client_id', profile.client_id)
      .in('kpi_id', kpiDefs.map(k => k.id))
      .order('recorded_at', { ascending: false })
      .limit(200)
  ).data : []

  const latestScan = scans?.[0] || null
  const previousScan = scans?.[1] || null

  return (
    <ClientDashboard
      client={client}
      latestScan={latestScan}
      previousScan={previousScan}
      scanHistory={scans || []}
      fixes={fixes || []}
      activity={activity || []}
      kpiDefs={kpiDefs || []}
      kpiValues={kpiValues || []}
    />
  )
}
