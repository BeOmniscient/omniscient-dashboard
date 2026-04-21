'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--navy)', fontFamily:'var(--fb)',
    }}>
      <div style={{
        width:'100%', maxWidth:'400px', padding:'0 20px',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{
            width:'48px', height:'48px', background:'var(--teal)', borderRadius:'12px',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--fd)', fontWeight:800, fontSize:'18px', color:'var(--navy)',
            margin:'0 auto 16px',
          }}>OS</div>
          <div style={{ fontFamily:'var(--fd)', fontSize:'1.375rem', fontWeight:700, color:'var(--tx)' }}>
            Omni<span style={{ color:'var(--teal)' }}>scient</span>
          </div>
          <div style={{ fontSize:'0.8125rem', color:'var(--tx3)', marginTop:'4px' }}>
            Digital Intelligence Dashboard
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background:'var(--n2)', border:'1px solid var(--b2)', borderRadius:'16px', padding:'32px',
        }}>
          <h1 style={{ fontFamily:'var(--fd)', fontSize:'1.25rem', fontWeight:700, marginBottom:'24px', color:'var(--tx)' }}>
            Sign in
          </h1>

          {error && (
            <div style={{
              background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)',
              borderRadius:'8px', padding:'10px 14px', marginBottom:'20px',
              fontSize:'0.8125rem', color:'#e74c3c',
            }}>{error}</div>
          )}

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, color:'var(--tx3)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width:'100%', padding:'10px 14px', background:'var(--n3)',
                  border:'1px solid var(--b2)', borderRadius:'8px', color:'var(--tx)',
                  fontFamily:'var(--fb)', fontSize:'0.9375rem', outline:'none',
                }}
              />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, color:'var(--tx3)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width:'100%', padding:'10px 14px', background:'var(--n3)',
                  border:'1px solid var(--b2)', borderRadius:'8px', color:'var(--tx)',
                  fontFamily:'var(--fb)', fontSize:'0.9375rem', outline:'none',
                }}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'12px', background: loading ? 'var(--n4)' : 'var(--teal)',
                color: loading ? 'var(--tx3)' : 'var(--navy)',
                border:'none', borderRadius:'8px', fontFamily:'var(--fb)',
                fontSize:'0.9375rem', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop:'4px',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:'24px', fontSize:'0.75rem', color:'var(--tx3)' }}>
          Omniscient Marketing · omniscient.marketing
        </div>
      </div>
    </div>
  )
}
