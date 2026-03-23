'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogCliente from '@/components/clienti/DialogCliente'

interface Cliente {
  id: string; nome: string; cognome: string
  email: string; telefono: string; note: string
  appuntamenti_futuri?: number
}

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
  </svg>
)
const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6.29 6.29l.96-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IconMail = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const IconNote = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

function Avatar({ nome, cognome, size = 'md' }: { nome: string; cognome: string; size?: 'sm' | 'md' }) {
  const initials = `${nome?.[0] || ''}${cognome?.[0] || ''}`.toUpperCase()
  return (
    <div className={`rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600 shrink-0 select-none
      ${size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'}`}>
      {initials}
    </div>
  )
}

export default function Clienti() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [ricerca, setRicerca] = useState('')
  // Default: lista (non griglia)
  const [vista, setVista] = useState<'griglia' | 'lista'>('lista')
  const [dialogAperto, setDialogAperto] = useState(false)
  const [clienteSelezionato, setClienteSelezionato] = useState<Cliente | undefined>()

  useEffect(() => { caricaClienti() }, [])

  async function caricaClienti() {
    // Carica clienti
    const { data: clientiData } = await supabase.from('clienti').select('*')
    if (!clientiData) { setLoading(false); return }

    // Carica appuntamenti futuri per ogni cliente
    const oggi = new Date().toISOString().split('T')[0]
    const { data: appData } = await supabase
      .from('appuntamenti')
      .select('cliente_id')
      .gte('data', oggi)
      .eq('stato', 'programmato')

    // Conta per cliente
    const conteggioMap = new Map<string, number>()
    ;(appData || []).forEach((a: any) => {
      conteggioMap.set(a.cliente_id, (conteggioMap.get(a.cliente_id) || 0) + 1)
    })

    const arricchiti = clientiData.map(c => ({
      ...c,
      appuntamenti_futuri: conteggioMap.get(c.id) || 0
    }))

    // Ordine alfabetico per NOME (poi cognome come secondary sort)
    arricchiti.sort((a, b) => {
      const nA = a.nome.toLowerCase(), nB = b.nome.toLowerCase()
      if (nA !== nB) return nA.localeCompare(nB, 'it')
      return a.cognome.toLowerCase().localeCompare(b.cognome.toLowerCase(), 'it')
    })

    setClienti(arricchiti)
    setLoading(false)
  }

  const clientiFiltrati = clienti.filter(c =>
    `${c.nome} ${c.cognome} ${c.email} ${c.telefono}`.toLowerCase().includes(ricerca.toLowerCase())
  )

  function apriModifica(c: Cliente) { setClienteSelezionato(c); setDialogAperto(true) }
  function chiudiDialog() { setDialogAperto(false); setClienteSelezionato(undefined) }

  async function eliminaCliente(id: string) {
    if (!confirm('Eliminare questo cliente?')) return
    await supabase.from('clienti').delete().eq('id', id)
    caricaClienti()
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Clienti</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconSearch /></span>
              <input type="text" placeholder="Cerca clienti..." value={ricerca}
                onChange={e => setRicerca(e.target.value)}
                className="border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52" />
            </div>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button onClick={() => setVista('griglia')}
                className={`p-2 transition-colors ${vista === 'griglia' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
                <IconGrid />
              </button>
              <button onClick={() => setVista('lista')}
                className={`p-2 transition-colors ${vista === 'lista' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
                <IconList />
              </button>
            </div>
            <button onClick={() => setDialogAperto(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
              + Nuovo
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Caricamento...</p>
        ) : clientiFiltrati.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-2xl">👤</div>
            <p className="text-sm">Nessun cliente trovato.</p>
          </div>
        ) : vista === 'griglia' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientiFiltrati.map(c => (
              <div key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => apriModifica(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar nome={c.nome} cognome={c.cognome} />
                    <div>
                      <h3 className="font-semibold text-gray-800">{c.nome} {c.cognome}</h3>
                      {(c.appuntamenti_futuri || 0) > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            <IconCalendar /> {c.appuntamenti_futuri}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); eliminaCliente(c.id) }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
                    <IconTrash />
                  </button>
                </div>
                <div className="space-y-1">
                  {c.telefono && <div className="flex items-center gap-1.5 text-sm text-gray-500"><IconPhone /><span>{c.telefono}</span></div>}
                  {c.email && <div className="flex items-center gap-1.5 text-sm text-gray-500"><IconMail /><span className="truncate">{c.email}</span></div>}
                  {c.note && <div className="flex items-center gap-1.5 text-sm text-gray-400"><IconNote /><span className="truncate">{c.note}</span></div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {clientiFiltrati.map((c, i) => (
              <div key={c.id}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition-colors cursor-pointer ${i !== 0 ? 'border-t border-gray-100' : ''}`}
                onClick={() => apriModifica(c)}>
                <Avatar nome={c.nome} cognome={c.cognome} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{c.nome} {c.cognome}</span>
                </div>
                {/* Badge appuntamenti futuri */}
                {(c.appuntamenti_futuri || 0) > 0 && (
                  <div className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
                    <IconCalendar />
                    <span>{c.appuntamenti_futuri}</span>
                  </div>
                )}
                {c.telefono && <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 shrink-0"><IconPhone /><span>{c.telefono}</span></div>}
                {c.email && <div className="hidden lg:flex items-center gap-1.5 text-sm text-gray-500 shrink-0"><IconMail /><span>{c.email}</span></div>}
                <button onClick={e => { e.stopPropagation(); eliminaCliente(c.id) }}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded ml-2">
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogAperto && (
        <DialogCliente onClose={chiudiDialog} onSaved={() => { chiudiDialog(); caricaClienti() }} cliente={clienteSelezionato} />
      )}
    </AppLayout>
  )
}
