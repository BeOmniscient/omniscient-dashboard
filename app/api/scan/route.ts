import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runClientScan, scanResultToDbRow } from '@/lib/scan-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Verify caller is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { client_id } = await req.json()
    if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients').select('*').eq('id', client_id).single()
    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Insert a running scan placeholder
    const { data: scan } = await supabase.from('scans').insert({
      client_id, scan_type: 'manual', status: 'running',
      overall_score: 0, overall_grade: '?',
    }).select().single()

    // Run the scan (async — respond immediately, update when done)
    runClientScan({
      clientId: client_id,
      clientName: client.name,
      websiteUrl: client.website_url || '',
      industry: client.industry || '',
      locations: client.locations || [],
    }).then(async (result) => {
      // Update scan with results
      await supabase.from('scans')
        .update(scanResultToDbRow(client_id, result, 'manual'))
        .eq('id', scan?.id)

      // Log activity
      await supabase.from('activity').insert({
        client_id,
        type: 'scan_complete',
        title: 'Manual scan completed',
        description: `Overall score: ${result.overall_score}/100 (${result.overall_grade})`,
      })
    }).catch(async (err) => {
      await supabase.from('scans')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', scan?.id)
    })

    return NextResponse.json({ success: true, scan_id: scan?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
