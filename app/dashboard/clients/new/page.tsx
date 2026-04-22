'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ClientTier, ClientStatus } from '@/types'

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    short_name: '',
    industry: '',
    website_url: '',
    contact_name: '',
    contact_email: '',
    tier: 'core' as ClientTier,
    status: 'onboarding' as ClientStatus,
    brand_primary: '#2EC4B6',
    brand_secondary: '#3A86FF',
    location_name: '',
    location_city: '',
    location_address: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // Verify admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const locations = form.location_name || form.location_city
        ? [{ name: form.location_name || form.name, city: form.location_city, address: form.location_address || undefined }]
        : []

      const { data, error: insertError } = await supabase.from('clients').insert({
        name: form.name,
        short_name: form.short_name || null,
        industry: form.industry || null,
        website_url: form.website_url || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        tier: form.tier,
        status: form.status,
        brand_primary: form.brand_primary,
        brand_secondary: form.brand_secondary,
        locations,
        onboarded_at: new Date().toISOString(),
      }).select().single()

      if (insertError) throw insertError

      // Log activity
      if (data) {
        await supabase.from('activity').insert({
          client_id: data.id,
          type: 'scan_complete',
          title: 'Client onboarded',
          description: `${form.name} added to the platform`,
        })
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create client'
      setError(message)
    } finally {
      setSaving(false)
    }
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
    ...inputStyle, appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238A9BBD' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 10px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px',
    paddingRight: 32,
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back nav */}
      <button onClick={() => router.push('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: 'var(--tx3)', fontFamily: 'var(--fb)',
          fontSize: '0.8125rem', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
        ← Back to Dashboard
      </button>

      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700,
        color: 'var(--tx)', marginBottom: 20 }}>Add New Client</div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 16 }}>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 4,
            borderBottom: '1px solid var(--b)' }}>Business Info</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Business Name *</label>
              <input required value={form.name} onChange={e => update('name', e.target.value)}
                placeholder="e.g. De Novo European Pub" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Short Name</label>
              <input value={form.short_name} onChange={e => update('short_name', e.target.value)}
                placeholder="e.g. De Novo" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <input value={form.industry} onChange={e => update('industry', e.target.value)}
                placeholder="e.g. Restaurant & Bar" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Website URL</label>
              <input value={form.website_url} onChange={e => update('website_url', e.target.value)}
                placeholder="https://example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input type="email" value={form.contact_email}
                onChange={e => update('contact_email', e.target.value)}
                placeholder="owner@example.com" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Contact Name</label>
              <input value={form.contact_name} onChange={e => update('contact_name', e.target.value)}
                placeholder="John Smith" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 16 }}>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 4,
            borderBottom: '1px solid var(--b)' }}>Location</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Location Name</label>
              <input value={form.location_name} onChange={e => update('location_name', e.target.value)}
                placeholder="Main Location" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City</label>
              <input value={form.location_city} onChange={e => update('location_city', e.target.value)}
                placeholder="Montclair, NJ" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Address</label>
              <input value={form.location_address} onChange={e => update('location_address', e.target.value)}
                placeholder="123 Main St" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--n2)', border: '1px solid var(--b)', borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20 }}>

          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tx2)',
            textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 4,
            borderBottom: '1px solid var(--b)' }}>Account Settings</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Tier</label>
              <select value={form.tier} onChange={e => update('tier', e.target.value)}
                style={selectStyle}>
                <option value="core">Core</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => update('status', e.target.value)}
                style={selectStyle}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Brand Primary</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.brand_primary}
                  onChange={e => update('brand_primary', e.target.value)}
                  style={{ width: 36, height: 36, border: '1px solid var(--b)', borderRadius: 6,
                    padding: 2, cursor: 'pointer', background: 'var(--n3)' }} />
                <input value={form.brand_primary}
                  onChange={e => update('brand_primary', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Brand Secondary</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.brand_secondary}
                  onChange={e => update('brand_secondary', e.target.value)}
                  style={{ width: 36, height: 36, border: '1px solid var(--b)', borderRadius: 6,
                    padding: 2, cursor: 'pointer', background: 'var(--n3)' }} />
                <input value={form.brand_secondary}
                  onChange={e => update('brand_secondary', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(232,99,74,0.1)', border: '1px solid rgba(232,99,74,0.3)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: '0.8125rem',
            marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.push('/dashboard')}
            style={{ background: 'var(--n3)', border: '1px solid var(--b)', borderRadius: 8,
              padding: '10px 20px', color: 'var(--tx2)', fontFamily: 'var(--fb)',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ background: saving ? 'var(--n5)' : 'var(--teal)',
              color: saving ? 'var(--tx3)' : 'var(--navy)', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontFamily: 'var(--fb)', fontSize: '0.875rem',
              fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating...' : 'Create Client →'}
          </button>
        </div>
      </form>
    </div>
  )
}
