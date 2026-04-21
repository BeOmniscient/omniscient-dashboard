import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch client data
  let client = null
  if (profile?.role === 'client' && profile.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', profile.client_id)
      .single()
    client = data
  }

  // Admins get all clients
  let allClients = null
  if (profile?.role === 'admin') {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    allClients = data
  }

  return (
    <DashboardShell profile={profile} client={client} allClients={allClients}>
      {children}
    </DashboardShell>
  )
}
