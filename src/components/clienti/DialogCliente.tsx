'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
  cliente?: { id: string; nome: string; cognome: string; email: string; telefono: string; note: string }
}

interface Appuntamento {
  id: string; data: string; ora_inizio: string; ora_fine: string
  tipologia_nome: string; tipologia_colore: string; stato: string
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const ANNI = Array.from({length: 5}, (_, i) => 2024 + i)

export default function DialogCliente({ onClose, onSaved, cliente }: Props) {
  const [nome, setNome] = useState(cliente?.nome || '')
  const [cognome, setCognome] = useState(cliente?.cognome || '')
  const [email, setEmail] = useState(cliente?.email || '')
  const [telefono, setTelefono] = useState(cliente?.telefono || '')
  const [note, setNote] = useState(cliente?.note || '')
  const [saving, setSaving] = useState(false)
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [tabApp, setTabApp] = useState<'attivi' | 'annullati'>('attivi')
  const [filtroApp, setFiltroApp] = useState('tutti')
  const [meseInizio, setMeseInizio] = useState(0)
  const [annoInizio, setAnnoInizio] = useState(2026)
  const [meseFine, setMeseFine] = useState(11)
  const [annoFine, setAnnoFine] = useState(2026)

  useEffect(() => {
    if (cliente?.id) {
      supabase.from('appuntamenti').select('*').eq('cliente_id', cliente.id)
        .order('data', { ascending: false })
        .then(({ data }) => { if (data) setAppuntamenti(data) })
    }
  }, [cliente])

  const attivi = appuntamenti.filter(a => a.stato !== 'cancellato')
  const annullati = appuntamenti.filter(a => a.stato === 'cancellato')

  const appFiltrati = (tabApp === 'attivi' ? attivi : annullati).filter(a => {
    if (filtroApp !== 'tutti') {
      const oggi = new Date().toISOString().split('T')[0]
      if (filtroApp === 'futuri' && a.data < oggi) return false
      if (filtroApp === 'passati' && a.data >= oggi) return false
    }
    const dataInizio = `${annoInizio}-${String(meseInizio + 1).padStart(2, '0')}-01`
    const dataFine = `${annoFine}-${String(meseFine + 1).padStart(2, '0')}-31`
    return a.data >= dataInizio && a.data <= dataFine
  })

  async function salva() {
    if (!cognome.trim()) return
    setSaving(true)
    if (cliente) {
      await supabase.from('clienti').update({ nome, cognome, email, telefono, note }).eq('id', cliente.id)
    } else {
      await supabase.from('clienti').insert({ nome, cognome, email, telefono, note })
    }
    setSaving(false)
    onSaved()
  }

  async function elimina() {
    if (!confirm('Eliminare questo cliente?')) return
    await supabase.from('clienti').delete().eq('id', cliente!.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col" style={{maxHeight: '90vh'}}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{cliente ? `${cliente.nome} ${cliente.cognome}` : 'Nuovo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sinistra */}
          <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200">
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cognome *</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cognome" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@esempio.it" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefono</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+39 ..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5} placeholder="Note sul cliente..." />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 space-y-2">
              {cliente && (
                <button onClick={elimina}
                  className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-2">
                  🗑 Elimina
                </button>
              )}
              <button onClick={onClose}
                className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Annulla
              </button>
              <button onClick={salva} disabled={saving}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>

          {/* Destra */}
          {cliente && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab */}
              <div className="flex gap-1 px-5 pt-4 border-b border-gray-200">
                <button onClick={() => setTabApp('attivi')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${tabApp === 'attivi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  📅 Attivi ({attivi.length})
                </button>
                <button onClick={() => setTabApp('annullati')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-1.5 border-b-2 transition-colors ${tabApp === 'annullati' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  ✕ Annullati ({annullati.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {/* Header lista */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">📅 Appuntamenti</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{appFiltrati.length}</span>
                  </div>
                  <button className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg hover:bg-blue-700">+</button>
                </div>

                {/* Filtro tipo */}
                <select value={filtroApp} onChange={e => setFiltroApp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="tutti">Tutti gli appuntamenti</option>
                  <option value="futuri">Appuntamenti futuri</option>
                  <option value="passati">Appuntamenti passati</option>
                </select>

                {/* Filtro periodo */}
                <div className="flex items-center gap-2 mb-4">
                  <select value={meseInizio} onChange={e => setMeseInizio(parseInt(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={annoInizio} onChange={e => setAnnoInizio(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span className="text-gray-400 text-xs">→</span>
                  <select value={meseFine} onChange={e => setMeseFine(parseInt(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={annoFine} onChange={e => setAnnoFine(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Lista appuntamenti */}
                {appFiltrati.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nessun appuntamento trovato.</p>
                ) : (
                  <div className="space-y-2">
                    {appFiltrati.map(a => (
                      <div key={a.id}
                        className="border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50"
                        style={{ borderLeft: `4px solid ${a.tipologia_colore || '#3B82F6'}` }}>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{a.tipologia_nome}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                            <span>📅 {new Date(a.data).toLocaleDateString('it-IT')}</span>
                            <span>⏰ {a.ora_inizio} - {a.ora_fine}</span>
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          a.stato === 'completato' ? 'bg-green-100 text-green-700' :
                          a.stato === 'cancellato' ? 'bg-red-100 text-red-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {a.stato === 'programmato' ? 'Programmato' : a.stato === 'completato' ? 'Completato' : 'Annullato'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}