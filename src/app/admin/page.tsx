'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Utente {
  id: string; nome: string; email: string
  ruolo: string; accesso_calendario: boolean; attivo: boolean
  created_at: string
}

export default function Admin() {
  const router = useRouter()
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [loading, setLoading] = useState(true)
  const [adminNome, setAdminNome] = useState('')
  const [adminId, setAdminId] = useState('')

  // Dialog nuovo/modifica utente
  const [dialogAperto, setDialogAperto] = useState(false)
  const [utenteEdit, setUtenteEdit] = useState<Utente | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRuolo, setFormRuolo] = useState('utente')
  const [formCalendario, setFormCalendario] = useState(true)
  const [formAttivo, setFormAttivo] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  // Dialog cambia mia password
  const [dialogMiaPassword, setDialogMiaPassword] = useState(false)
  const [miaVecchiaPass, setMiaVecchiaPass] = useState('')
  const [miaNuovaPass, setMiaNuovaPass] = useState('')
  const [miaConfermaPass, setMiaConfermaPass] = useState('')
  const [errMiaPass, setErrMiaPass] = useState('')
  const [okMiaPass, setOkMiaPass] = useState(false)
  const [savingMiaPass, setSavingMiaPass] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('ccm_utente')
    if (!raw) { router.push('/login'); return }
    const u = JSON.parse(raw)
    if (u.ruolo !== 'admin') { router.push('/calendario'); return }
    setAdminNome(u.nome)
    setAdminId(u.id)
    caricaUtenti()
  }, [])

  async function caricaUtenti() {
    const { data } = await supabase.from('utenti').select('*').order('created_at')
    if (data) setUtenti(data)
    setLoading(false)
  }

  function apriNuovo() {
    setUtenteEdit(null)
    setFormNome(''); setFormEmail(''); setFormPassword('')
    setFormRuolo('utente'); setFormCalendario(true); setFormAttivo(true)
    setErrore(''); setDialogAperto(true)
  }

  function apriModifica(u: Utente) {
    setUtenteEdit(u)
    setFormNome(u.nome); setFormEmail(u.email); setFormPassword('')
    setFormRuolo(u.ruolo); setFormCalendario(u.accesso_calendario); setFormAttivo(u.attivo)
    setErrore(''); setDialogAperto(true)
  }

  async function salva() {
    if (!formNome.trim() || !formEmail.trim()) { setErrore('Nome e email sono obbligatori'); return }
    if (!utenteEdit && !formPassword.trim()) { setErrore('Inserisci una password per il nuovo utente'); return }
    setSaving(true); setErrore('')
    const dati: any = {
      nome: formNome.trim(), email: formEmail.trim().toLowerCase(),
      ruolo: formRuolo, accesso_calendario: formCalendario, attivo: formAttivo,
    }
    if (formPassword.trim()) dati.password = formPassword.trim()
    if (utenteEdit) {
      const { error } = await supabase.from('utenti').update(dati).eq('id', utenteEdit.id)
      if (error) { setErrore('Errore: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('utenti').insert(dati)
      if (error) {
        setErrore(error.message.includes('unique') ? 'Email già registrata' : 'Errore: ' + error.message)
        setSaving(false); return
      }
    }
    setSaving(false); setDialogAperto(false); caricaUtenti()
  }

  async function elimina(id: string, nome: string) {
    if (!confirm(`Eliminare l'utente "${nome}"?`)) return
    await supabase.from('utenti').delete().eq('id', id)
    caricaUtenti()
  }

  async function toggleAttivo(u: Utente) {
    await supabase.from('utenti').update({ attivo: !u.attivo }).eq('id', u.id)
    caricaUtenti()
  }

  async function toggleCalendario(u: Utente) {
    await supabase.from('utenti').update({ accesso_calendario: !u.accesso_calendario }).eq('id', u.id)
    caricaUtenti()
  }

  function logout() {
    localStorage.removeItem('ccm_utente')
    router.push('/')
  }

  function apriCambiaPassword() {
    setMiaVecchiaPass(''); setMiaNuovaPass(''); setMiaConfermaPass('')
    setErrMiaPass(''); setOkMiaPass(false)
    setDialogMiaPassword(true)
  }

  async function cambiaPassword() {
    setErrMiaPass('')
    if (!miaVecchiaPass || !miaNuovaPass || !miaConfermaPass) { setErrMiaPass('Compila tutti i campi'); return }
    if (miaNuovaPass !== miaConfermaPass) { setErrMiaPass('Le nuove password non coincidono'); return }
    if (miaNuovaPass.length < 4) { setErrMiaPass('Minimo 4 caratteri'); return }
    setSavingMiaPass(true)
    const { data: check } = await supabase.from('utenti')
      .select('id').eq('id', adminId).eq('password', miaVecchiaPass).single()
    if (!check) { setErrMiaPass('Password attuale non corretta'); setSavingMiaPass(false); return }
    await supabase.from('utenti').update({ password: miaNuovaPass }).eq('id', adminId)
    setSavingMiaPass(false); setOkMiaPass(true)
    setTimeout(() => { setDialogMiaPassword(false); setOkMiaPass(false) }, 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Helvetica Neue', sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 300, color: '#2d3a4a', letterSpacing: '0.03em' }}>
            CorpoCoscienteMente<sup style={{ fontSize: '0.55em' }}>®</sup>
          </span>
          <span style={{ color: '#cbd5e0', fontSize: 18 }}>·</span>
          <span style={{ fontSize: 13, color: '#718096' }}>Gestione utenti</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/calendario')}
            style={{ fontSize: 13, color: '#4a6a9a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Vai al calendario →
          </button>
          <span style={{ fontSize: 13, color: '#718096' }}>{adminNome}</span>
          <button onClick={apriCambiaPassword}
            style={{ fontSize: 12, color: '#718096', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cambia password
          </button>
          <button onClick={logout}
            style={{ fontSize: 12, color: '#a0aec0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Esci
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 300, color: '#2d3a4a' }}>Utenti</h1>
          <button onClick={apriNuovo}
            style={{ background: 'linear-gradient(135deg,#4a6a9a,#6a5a9a)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nuovo utente
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#a0aec0', fontSize: 14 }}>Caricamento...</p>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px 130px 100px 130px', padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <div>Nome</div><div>Email</div><div>Ruolo</div><div>Calendario</div><div>Stato</div><div></div>
            </div>
            {utenti.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Nessun utente</div>
            ) : utenti.map((u, i) => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px 130px 100px 130px', padding: '14px 20px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid #f0f4f8', opacity: u.attivo ? 1 : 0.5 }}>
                <div style={{ fontSize: 14, color: '#2d3a4a' }}>{u.nome}</div>
                <div style={{ fontSize: 13, color: '#718096' }}>{u.email}</div>
                <div>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: u.ruolo === 'admin' ? '#ebf4ff' : '#f0fff4', color: u.ruolo === 'admin' ? '#2b6cb0' : '#276749' }}>
                    {u.ruolo === 'admin' ? 'Admin' : 'Utente'}
                  </span>
                </div>
                <div>
                  <button onClick={() => toggleCalendario(u)}
                    style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: u.accesso_calendario ? '#f0fff4' : '#fff5f5', color: u.accesso_calendario ? '#276749' : '#c53030' }}>
                    {u.accesso_calendario ? '✓ Abilitato' : '✕ Disabilitato'}
                  </button>
                </div>
                <div>
                  <button onClick={() => toggleAttivo(u)}
                    style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: u.attivo ? '#ebf8ff' : '#f7fafc', color: u.attivo ? '#2c5282' : '#a0aec0' }}>
                    {u.attivo ? 'Attivo' : 'Inattivo'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => apriModifica(u)} style={{ fontSize: 12, color: '#4a6a9a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Modifica</button>
                  <button onClick={() => elimina(u.id, u.nome)} style={{ fontSize: 12, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Elimina</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog nuovo/modifica utente */}
      {dialogAperto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 300, color: '#2d3a4a' }}>{utenteEdit ? 'Modifica utente' : 'Nuovo utente'}</h2>
              <button onClick={() => setDialogAperto(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#a0aec0', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Nome *', type: 'text', val: formNome, set: setFormNome },
                { label: 'Email *', type: 'email', val: formEmail, set: setFormEmail },
              ].map(({ label, type, val, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#2d3a4a' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>
                  Password {utenteEdit ? '(lascia vuoto per non cambiare)' : '*'}
                </label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                  placeholder={utenteEdit ? '••••••••' : 'Nuova password'}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#2d3a4a' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>Ruolo</label>
                <select value={formRuolo} onChange={e => setFormRuolo(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#2d3a4a', background: 'white' }}>
                  <option value="utente">Utente</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#4a5568' }}>
                  <input type="checkbox" checked={formCalendario} onChange={e => setFormCalendario(e.target.checked)} />
                  Accesso al calendario
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#4a5568' }}>
                  <input type="checkbox" checked={formAttivo} onChange={e => setFormAttivo(e.target.checked)} />
                  Utente attivo
                </label>
              </div>
            </div>
            {errore && <div style={{ marginTop: 12, fontSize: 12, color: '#c53030', background: '#fff5f5', padding: '8px 12px', borderRadius: 8 }}>⚠️ {errore}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setDialogAperto(false)}
                style={{ flex: 1, padding: 11, border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#4a5568' }}>
                Annulla
              </button>
              <button onClick={salva} disabled={saving}
                style={{ flex: 1, padding: 11, border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#4a6a9a,#6a5a9a)', color: 'white', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvataggio...' : utenteEdit ? 'Salva modifiche' : 'Crea utente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog cambia mia password */}
      {dialogMiaPassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 300, color: '#2d3a4a' }}>Cambia la tua password</h2>
              <button onClick={() => setDialogMiaPassword(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#a0aec0', cursor: 'pointer' }}>✕</button>
            </div>
            {okMiaPass ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                <p style={{ fontSize: 14, color: '#38a169' }}>Password aggiornata</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {([['Password attuale', miaVecchiaPass, setMiaVecchiaPass], ['Nuova password', miaNuovaPass, setMiaNuovaPass], ['Conferma nuova password', miaConfermaPass, setMiaConfermaPass]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                  <div key={label}>
                    <label style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type="password" value={val} onChange={e => setter(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && cambiaPassword()}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: '#2d3a4a' }} />
                  </div>
                ))}
                {errMiaPass && <div style={{ fontSize: 12, color: '#c53030', background: '#fff5f5', padding: '8px 12px', borderRadius: 8 }}>⚠️ {errMiaPass}</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setDialogMiaPassword(false)}
                    style={{ flex: 1, padding: 11, border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#4a5568' }}>
                    Annulla
                  </button>
                  <button onClick={cambiaPassword} disabled={savingMiaPass}
                    style={{ flex: 1, padding: 11, border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', background: 'linear-gradient(135deg,#4a6a9a,#6a5a9a)', color: 'white', opacity: savingMiaPass ? 0.6 : 1 }}>
                    {savingMiaPass ? '...' : 'Aggiorna'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
