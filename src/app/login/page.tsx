'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const utente = localStorage.getItem('ccm_utente')
    if (utente) {
      const u = JSON.parse(utente)
      if (u.ruolo === 'admin') router.push('/admin')
      else if (u.accesso_calendario) router.push('/calendario')
    }
  }, [])

  async function accedi() {
    if (!email.trim() || !password.trim()) {
      setErrore('Inserisci email e password')
      return
    }
    setLoading(true)
    setErrore('')

    const { data, error } = await supabase
      .from('utenti')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .eq('attivo', true)
      .single()

    setLoading(false)

    if (error || !data) {
      setErrore('Email o password non corretti')
      return
    }

    if (!data.accesso_calendario && data.ruolo !== 'admin') {
      setErrore('Accesso non autorizzato. Contatta l\'amministratore.')
      return
    }

    // Salva sessione in localStorage
    localStorage.setItem('ccm_utente', JSON.stringify({
      id: data.id,
      nome: data.nome,
      email: data.email,
      ruolo: data.ruolo,
      accesso_calendario: data.accesso_calendario,
    }))

    if (data.ruolo === 'admin') router.push('/admin')
    else router.push('/calendario')
  }

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .bg {
          position: fixed; inset: 0; z-index: 0;
          background: linear-gradient(135deg,
            #cddcec 0%, #ddd5ef 20%, #eddde9 40%,
            #f0e6dc 60%, #ddeaf5 80%, #cddcec 100%);
          background-size: 600% 600%;
          animation: aurora 16s ease infinite;
        }
        @keyframes aurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 100%; }
          100% { background-position: 0% 50%; }
        }
        .wrap {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100vh;
        }
        .card {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 20px;
          padding: 48px 44px 40px;
          width: 100%; max-width: 380px;
          box-shadow: 0 8px 40px rgba(60,80,120,0.10);
          animation: fadeUp 0.8s ease forwards;
          opacity: 0;
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .logo {
          text-align: center; margin-bottom: 32px;
        }
        .logo-title {
          font-size: 17px; font-weight: 200; letter-spacing: 0.05em;
          color: #2d3a4a;
        }
        .logo-title sup { font-size: 0.55em; vertical-align: super; opacity: 0.6; }
        .label {
          display: block; font-size: 11px; font-weight: 400;
          color: #5a6a7a; letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .input {
          width: 100%; border: 1px solid rgba(60,80,120,0.18);
          border-radius: 10px; padding: 11px 14px; font-size: 14px;
          color: #2d3a4a; background: rgba(255,255,255,0.6);
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          margin-bottom: 18px;
          font-family: inherit;
        }
        .input:focus {
          border-color: rgba(60,80,120,0.4);
          box-shadow: 0 0 0 3px rgba(100,130,180,0.12);
        }
        .btn {
          width: 100%; padding: 12px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #4a6a9a, #6a5a9a);
          color: white; font-size: 14px; font-weight: 300;
          letter-spacing: 0.06em; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          font-family: inherit;
          margin-top: 4px;
        }
        .btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .errore {
          font-size: 12px; color: #c0392b; text-align: center;
          margin-top: 14px; min-height: 18px;
        }
        .back {
          text-align: center; margin-top: 22px;
        }
        .back a {
          font-size: 12px; color: #6a7a8a; text-decoration: none;
          font-weight: 300; letter-spacing: 0.04em; opacity: 0.7;
        }
        .back a:hover { opacity: 1; }
      `}</style>

      <div className="bg" />

      <div className="wrap">
        <div className="card">
          <div className="logo">
            <div className="logo-title">CorpoCoscienteMente<sup>®</sup></div>
          </div>

          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            onKeyDown={e => e.key === 'Enter' && accedi()}
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && accedi()}
          />

          <button className="btn" onClick={accedi} disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>

          {errore && <div className="errore">{errore}</div>}

          <div className="back">
            <a href="/">← Torna alla home</a>
          </div>
        </div>
      </div>
    </>
  )
}
