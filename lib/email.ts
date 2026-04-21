import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'reports@omniscient.marketing'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dashboard.omniscient.marketing'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

interface MonthlyReportEmailInput {
  to: string
  clientName: string
  month: number
  year: number
  score: number
  grade: string
  delta: number
  summary: string
  reportId: string
}

export async function sendMonthlyReport(input: MonthlyReportEmailInput) {
  const { to, clientName, month, year, score, grade, delta, summary, reportId } = input
  const monthName = MONTHS[month - 1]
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`
  const gradeColor = grade.startsWith('A') ? '#2EC4B6'
    : grade.startsWith('B') ? '#3A86FF'
    : grade.startsWith('C') ? '#F5A623' : '#E8634A'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${monthName} ${year} Report — ${clientName}</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:36px;height:36px;background:#2EC4B6;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#080E1A;">OS</div>
      <span style="font-size:1.125rem;font-weight:700;color:#0B1526;">Omniscient</span>
    </div>
    <div style="font-size:0.8125rem;color:#8A9BBD;">${monthName} ${year} Monthly Report</div>
  </div>

  <!-- Score card -->
  <div style="background:#0D1526;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
    <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;color:#4A5A7A;margin-bottom:8px;">Overall Digital Grade</div>
    <div style="font-size:4rem;font-weight:800;color:${gradeColor};line-height:1;margin-bottom:4px;">${grade}</div>
    <div style="font-size:1.25rem;font-weight:600;color:#F0F4FF;margin-bottom:12px;">${score}/100</div>
    <div style="display:inline-block;padding:6px 16px;border-radius:999px;background:${delta >= 0 ? 'rgba(46,196,182,0.15)' : 'rgba(232,99,74,0.15)'};color:${delta >= 0 ? '#2EC4B6' : '#E8634A'};font-size:0.875rem;font-weight:700;">
      ${delta >= 0 ? '↑' : '↓'} ${deltaStr} pts vs. last month
    </div>
  </div>

  <!-- Summary -->
  <div style="background:#FFFFFF;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid rgba(0,0,0,0.07);">
    <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#8A9BBD;margin-bottom:12px;font-weight:600;">Monthly Summary</div>
    <div style="font-size:0.9375rem;color:#3A4A66;line-height:1.7;white-space:pre-line;">${summary}</div>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#2EC4B6;color:#080E1A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9375rem;">
      View Full Dashboard →
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:0.75rem;color:#8A9BBD;border-top:1px solid rgba(0,0,0,0.07);padding-top:24px;">
    <div style="margin-bottom:4px;font-weight:600;color:#3A4A66;">Omniscient Marketing</div>
    <div>hello@omniscient.marketing · omniscient.marketing</div>
    <div style="margin-top:8px;">You're receiving this because you're an Omniscient client.</div>
  </div>

</div>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${clientName} — ${monthName} ${year} Monthly Report (${grade}, ${score}/100)`,
    html,
  })
}

interface WelcomeEmailInput {
  to: string
  clientName: string
  contactName: string
  score: number
  grade: string
  loginUrl: string
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const { to, clientName, contactName, score, grade, loginUrl } = input

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Omniscient — your dashboard is ready`,
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#0D1526;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
    <div style="font-size:2.5rem;font-weight:800;color:#2EC4B6;margin-bottom:8px;">${grade}</div>
    <div style="color:#F0F4FF;font-size:1rem;">Your starting score: ${score}/100</div>
  </div>
  <div style="background:#FFFFFF;border-radius:12px;padding:24px;margin-bottom:24px;">
    <p style="color:#3A4A66;font-size:0.9375rem;line-height:1.7;">Hi ${contactName},</p>
    <p style="color:#3A4A66;font-size:0.9375rem;line-height:1.7;margin-top:12px;">
      Your Omniscient dashboard for <strong>${clientName}</strong> is live. 
      This is your starting point — we'll update your scores weekly as we deploy fixes.
    </p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${loginUrl}" style="display:inline-block;background:#2EC4B6;color:#080E1A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">
        View Your Dashboard →
      </a>
    </div>
  </div>
  <div style="text-align:center;font-size:0.75rem;color:#8A9BBD;">
    Omniscient Marketing · hello@omniscient.marketing
  </div>
</div>
</body>
</html>`,
  })
}
