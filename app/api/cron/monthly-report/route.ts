import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendMonthlyReport } from '@/lib/email'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()  // previous month
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const { data: clients } = await supabase
    .from('clients').select('*').eq('status', 'active')

  const results = []

  for (const client of clients || []) {
    try {
      // Get all scans from the previous month
      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { data: scans } = await supabase
        .from('scans').select('*')
        .eq('client_id', client.id)
        .eq('status', 'complete')
        .gte('scanned_at', startOfMonth)
        .lte('scanned_at', endOfMonth)
        .order('scanned_at', { ascending: true })

      if (!scans?.length) {
        results.push({ client: client.name, status: 'skipped', reason: 'no scans this month' })
        continue
      }

      const firstScan = scans[0]
      const lastScan = scans[scans.length - 1]
      const delta = lastScan.overall_score - firstScan.overall_score

      // Get fixes completed this month
      const { data: fixes } = await supabase
        .from('fixes').select('*')
        .eq('client_id', client.id)
        .eq('status', 'done')
        .gte('completed_at', startOfMonth)
        .lte('completed_at', endOfMonth)

      // Generate Claude summary
      const summaryResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Write a concise, encouraging monthly report summary for ${client.name}.
Data:
- Start of month score: ${firstScan.overall_score}/100 (${firstScan.overall_grade})
- End of month score: ${lastScan.overall_score}/100 (${lastScan.overall_grade})
- Change: ${delta >= 0 ? '+' : ''}${delta} points
- Fixes completed: ${fixes?.map(f => f.name).join(', ') || 'none'}
- Biggest current opportunity: ${lastScan.overall_verdict}

Write 3 short paragraphs: (1) what improved this month, (2) what's in progress, (3) what's coming next month. Tone: professional, direct, optimistic. No fluff.`
        }]
      })

      const summary = summaryResponse.content[0].type === 'text'
        ? summaryResponse.content[0].text : ''

      // Save report
      const { data: report } = await supabase.from('reports').insert({
        client_id: client.id,
        period_month: month,
        period_year: year,
        overall_score: lastScan.overall_score,
        overall_grade: lastScan.overall_grade,
        summary,
      }).select().single()

      // Send email if client has a contact email
      if (client.contact_email && report) {
        await sendMonthlyReport({
          to: client.contact_email,
          clientName: client.name,
          month, year,
          score: lastScan.overall_score,
          grade: lastScan.overall_grade,
          delta,
          summary,
          reportId: report.id,
        })

        await supabase.from('reports')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', report.id)

        await supabase.from('activity').insert({
          client_id: client.id,
          type: 'report_sent',
          title: `Monthly report sent`,
          description: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year} report emailed to ${client.contact_email}`,
        })
      }

      results.push({ client: client.name, score: lastScan.overall_score, delta, status: 'ok' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ client: client.name, status: 'error', error: message })
    }
  }

  return NextResponse.json({ month, year, processed: results.length, results })
}
