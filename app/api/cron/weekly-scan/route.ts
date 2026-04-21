import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runClientScan, scanResultToDbRow } from '@/lib/scan-engine'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all active clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active')

  if (error || !clients?.length) {
    return NextResponse.json({ message: 'No active clients', error })
  }

  const results = []

  for (const client of clients) {
    try {
      console.log(`[weekly-scan] Scanning ${client.name}...`)

      const result = await runClientScan({
        clientId: client.id,
        clientName: client.name,
        websiteUrl: client.website_url || '',
        industry: client.industry || '',
        locations: client.locations || [],
      })

      await supabase.from('scans')
        .insert(scanResultToDbRow(client.id, result, 'weekly'))

      await supabase.from('activity').insert({
        client_id: client.id,
        type: 'scan_complete',
        title: 'Weekly scan completed',
        description: `Overall score: ${result.overall_score}/100 (${result.overall_grade})`,
        metadata: { score: result.overall_score, grade: result.overall_grade },
      })

      results.push({ client: client.name, score: result.overall_score, status: 'ok' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[weekly-scan] Failed for ${client.name}:`, message)
      results.push({ client: client.name, status: 'error', error: message })
    }
  }

  return NextResponse.json({ scanned: results.length, results })
}
