'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const IconCalendario = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconClienti = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconListaAttesa = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/>
  </svg>
)
const IconTipologie = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)

const menuItems = [
  { href: '/calendario',   label: 'Calendario',     Icon: IconCalendario  },
  { href: '/clienti',      label: 'Clienti',         Icon: IconClienti     },
  { href: '/lista-attesa', label: "Lista d'attesa",  Icon: IconListaAttesa },
  { href: '/tipologie',    label: 'Tipologie',       Icon: IconTipologie   },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [nomeUtente, setNomeUtente] = useState('')
  const [ruolo, setRuolo] = useState('')
  const [utenteId, setUtenteId] = useState('')
  const [dialogPassword, setDialogPassword] = useState(false)
  const [vecchiaPassword, setVecchiaPassword] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [errorePassword, setErrorePassword] = useState('')
  const [successoPassword, setSuccessoPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('ccm_utente')
    if (raw) {
      const u = JSON.parse(raw)
      setNomeUtente(u.nome || '')
      setRuolo(u.ruolo || '')
      setUtenteId(u.id || '')
    }
  }, [])

  function logout() {
    localStorage.removeItem('ccm_utente')
    router.push('/')
  }

  async function cambiaPassword() {
    setErrorePassword('')
    setSuccessoPassword(false)

    if (!vecchiaPassword || !nuovaPassword || !confermaPassword) {
      setErrorePassword('Compila tutti i campi'); return
    }
    if (nuovaPassword !== confermaPassword) {
      setErrorePassword('Le nuove password non coincidono'); return
    }
    if (nuovaPassword.length < 4) {
      setErrorePassword('La password deve essere di almeno 4 caratteri'); return
    }

    setSaving(true)

    // Verifica vecchia password
    const { data } = await supabase.from('utenti')
      .select('id').eq('id', utenteId).eq('password', vecchiaPassword).single()

    if (!data) {
      setErrorePassword('La password attuale non è corretta')
      setSaving(false); return
    }

    // Aggiorna password
    await supabase.from('utenti').update({ password: nuovaPassword }).eq('id', utenteId)

    setSaving(false)
    setSuccessoPassword(true)
    setVecchiaPassword(''); setNuovaPassword(''); setConfermaPassword('')
    setTimeout(() => { setDialogPassword(false); setSuccessoPassword(false) }, 1500)
  }

  const iniziali = nomeUtente.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)

  return (
    <>
      <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
              <IconCalendario />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">CorpoCosciente</h1>
              <p className="text-[10px] text-gray-400 leading-tight">Mente</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
                <span className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`}><Icon /></span>
                {label}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
              </Link>
            )
          })}
          {ruolo === 'admin' && (
            <Link href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${pathname.startsWith('/admin')
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md shadow-purple-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
              <span className="shrink-0 opacity-60">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              Gestione utenti
            </Link>
          )}
        </nav>

        {/* Utente loggato */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600 shrink-0">
              {iniziali}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{nomeUtente}</p>
              <p className="text-[10px] text-gray-400 capitalize">{ruolo}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-1 px-1">
            <button onClick={() => setDialogPassword(true)}
              className="flex-1 text-xs text-gray-400 hover:text-gray-600 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left px-2">
              Cambia password
            </button>
            <button onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 py-1.5 px-3 rounded-lg hover:bg-red-50 transition-colors">
              Esci
            </button>
          </div>
        </div>
      </div>

      {/* Dialog cambia password */}
      {dialogPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">Cambia password</h2>
              <button onClick={() => { setDialogPassword(false); setErrorePassword(''); setSuccessoPassword(false) }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {successoPassword ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-sm text-green-600 font-medium">Password aggiornata</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Password attuale</label>
                  <input type="password" value={vecchiaPassword} onChange={e => setVecchiaPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Nuova password</label>
                  <input type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Conferma nuova password</label>
                  <input type="password" value={confermaPassword} onChange={e => setConfermaPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && cambiaPassword()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {errorePassword && (
                  <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠️ {errorePassword}</div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setDialogPassword(false); setErrorePassword('') }}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Annulla
                  </button>
                  <button onClick={cambiaPassword} disabled={saving}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Salvataggio...' : 'Aggiorna'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
