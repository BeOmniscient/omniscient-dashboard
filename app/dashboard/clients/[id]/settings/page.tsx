'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types'

interface SocialLinks {
  google_business: string
  facebook: string
  instagram: string
  tiktok: string
  linkedin: string
  twitter: string
  youtube: string
  yelp: string
  tripadvisor: string
  [key: string]: string
}

const SOCIAL_PLATFORMS = [
  { key: 'google_business', label: 'Google Business Profile', icon: '📍', placeholder: 'https://g.page/your-business or Google Maps URL' },
  { key: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourbusiness' },
  { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/yourbusiness' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourbusiness' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/yourbusiness' },
  { key: 'twitter', label: 'X / Twitter', icon: '𝕏', placeholder: 'https://x.com/yourbusiness' },
  { key: 'youtube', label: 'YouTube', icon: '▶', placeholder: 'https://youtube.com/@yourbusiness' },
  { key: 'yelp', label: 'Yelp', icon: '⭐', placeholder: 'https://yelp.com/biz/yourbusiness' },
  { key: 'tripadvisor', label: 'TripAdvisor', icon: '🦉', placeholder: 'https://tripadvisor.com/Restaurant_Review-...' },
]

const EMPTY_LINKS: SocialLinks = {
  google_business: '', facebook: '', instagram: '', tiktok: '',
  linkedin: '', twitter: '', youtube: '', yelp: '', tripadvisor: '',
}

export default function ClientSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [links, setLinks] = useState<SocialLinks>({ ...EMPTY_LINKS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable client fields
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [tier, setTier] = useState('core')
  const [status, setStatus] = useState('active')

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role !== 'admin') { router.push('/dashboard'); return }

        const { data, error: fetchErr } = await supabase
          .from('clients').select('*').eq('id', clientId).single()
        if (fetchErr || !data) { setError('Client not found'); setLoading(false); return }

        setClient(data)
        setName(data.name || '')
        setIndustry(data.industry || '')
        setWebsiteUrl(data.website_url || '')
        setContactName(data.contact_name || '')
        setContactEmail(data.contact_email || '')
        setTier(data.tier || 'core')
        setStatus(data.status || 'active')

        // Load existing social links from the client record
        if (data.social_links && typeof data.social_links === 'object') {
          setLinks({ ...EMPTY_LINKS, ...(data.social_links as Record<string, string>) })
        }
      } catch (err) { console.error(err); setError('Failed to load') }
      finally { setLoading(false) }
    }
    load()
  }, [clientId, router])

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      // Filter out empty links
      const cleanLinks: Record<string, string> = {}
      for (const [k, v] of Object.entries(links)) {
        if (v.trim()) cleanLinks[k] = v.trim()
      }

      const { error: updateErr } = await supabase.from('clients').update({
        name, industry: industry || null, website_url: websiteUrl || null,
        contact_name: contactName || null, contact_email: contactEmail || null,
        tier, status, social_links: cleanLinks, updated_at: new Date().toISOString(),
      }).eq('id', clientId)

      if (updateErr) throw updateErr
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--tx2)' }}>Loading...</div>
  )

  if (error && !client) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
      <div style={{ color: 'var(--red)', fontSize: '0.9375rem', fontWeight: 600 }}>{error}</div>
      <button onClick={() => router.push('/dashboard')} style={backBtnStyle}>Back to Dashboard</button>
    </div>
  )

  const filledCount = Object.values(links).filter(v => v.trim()).length

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={backBtnStyle}>
          ← {client?.name || 'Client'}
        </button>
        <span style={{ color: 'var(--tx3)', fontSize: '0.8125rem' }}>/</span>
        <span style={{ color: 'var(--tx2)', fontSize: '0.8125rem', fontWeight: 600 }}>Settings</span>
      </div>

      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--tx)', marginBottom: 20 }}>
        Client Settings
      </div>

      {/* Basic Info */}
      <Section title="Business Info">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Business Name" value={name} onChange={setName} placeholder="Business name" span />
          <Field label="Industry" value={industry} onChange={setIndustry} placeholder="e.g. Restaurant & Bar" />
          <Field label="Website" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://example.com" />
          <Field label="Contact Name" value={contactName} onChange={setContactName} placeholder="Owner name" />
          <Field label="Contact Email" value={contactEmail} onChange={setContactEmail} placeholder="email@example.com" type="email" />
          <div>
            <label style={labelStyle}>Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)} style={selectStyle}>
              <option value="core">Core</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Google Business Profile — featured */}
      <Section title="Google Business Profile" accent="var(--blue)">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(58,134,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>📍</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>Google Business Profile URL</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--tx3)', marginBottom: 8 }}>
              Paste your Google Business Profile link. Find it at business.google.com or search your business on Google Maps and copy the URL.
            </div>
            <input value={links.google_business} onChange={e => setLinks(prev => ({ ...prev, google_business: e.target.value }))}
              placeholder="https://g.page/your-business or Google Maps URL" style={inputStyle} />
          </div>
        </div>
      </Section>

      {/* Social Media Links */}
      <Section title={`Social Media Accounts (${filledCount} connected)`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SOCIAL_PLATFORMS.filter(p => p.key !== 'google_business').map(platform => (
            <div key={platform.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--n4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                {platform.icon}
              </div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)' }}>{platform.label}</div>
              </div>
              <input value={links[platform.key] || ''} onChange={e => setLinks(prev => ({ ...prev, [platform.key]: e.target.value }))}
                placeholder={platform.placeholder}
                style={{ ...inputStyle, flex: 1, background: 'var(--n2)' }} />
              {links[platform.key]?.trim() && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Review Platforms */}
      <Section title="Review Platforms">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'yelp', label: 'Yelp', icon: '⭐' },
            { key: 'tripadvisor', label: 'TripAdvisor', icon: '🦉' },
          ].map(platform => (
            <div key={platform.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--n4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{platform.icon}</div>
              <div style={{ width: 90, flexShrink: 0 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--tx)' }}>{platform.label}</div>
              </div>
              <input value={links[platform.key] || ''} onChange={e => setLinks(prev => ({ ...prev, [platform.key]: e.target.value }))}
                placeholder={`https://${platform.key}.com/biz/yourbusiness`}
                style={{ ...inputStyle, flex: 1, background: 'var(--n2)' }} />
              {links[platform.key]?.trim() && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Save bar */}
      {error && (
        <div style={{ background: 'rgba(232,99,74,0.1)', border: '1px solid rgba(232,99,74,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: '0.8125rem', marginBottom: 14 }}>{error}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 40, marginTop: 4 }}>
        {saved && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--teal)', fontWeight: 600 }}>Saved</span>
        )}
        <button onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          style={{ background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8, padding: '10px 20px', color: 'var(--tx2)', fontFamily: 'var(--fb)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ background: saving ? 'var(--n5)' : 'var(--teal)', color: saving ? 'var(--tx3)' : 'var(--navy)', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'var(--fb)', fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// --- Sub-components ---

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />}
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 8, marginBottom: 16, borderBottom: '1px solid var(--b)' }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type, span }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; span?: boolean
}) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label style={labelStyle}>{label}</label>
      <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'var(--n3)',
  border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--tx)',
  fontFamily: 'var(--fb)', fontSize: '0.875rem', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6875rem', fontWeight: 600,
  color: 'var(--tx3)', marginBottom: 5, textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, paddingRight: 32,
}

const backBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, background: 'none',
  border: 'none', color: 'var(--tx3)', fontFamily: 'var(--fb)',
  fontSize: '0.8125rem', cursor: 'pointer', padding: 0,
}
