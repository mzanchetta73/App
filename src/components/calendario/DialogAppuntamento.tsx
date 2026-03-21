'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente { id: string; nome: string; cognome: string }
interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Props { data: string; onClose: () => void; onSaved: () => void }

export default function DialogAppuntamento({ data, onClose, onSaved }: Props) {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [clienteId, setClienteId] = useState('')
  const [nuovoCliente, setNuovoCliente] = useState(false)
  const [nomeNuovo, setNomeNuovo] = useState('')
  const [cognomeNuovo, setCognomeNuovo] = useState('')
  const [tipologiaId, setTipologiaId] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('10:00')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('clienti').select('id, nome, cognome').order('cognome').then(({ data }) => { if (data) setClienti(data) })
    supabase.from('tipologie').select('*').order('nome').then(({ data }) => { if (data) setTipologie(data) })
  }, [])

  function calcolaFine(inizio: string, durata: number) {
    const [ore, minuti] = inizio.split(':').map(Number)
    const tot = ore * 60 + minuti + durata
    return `${Math.floor(tot/60).toString().padStart(2,'0')}:${(tot%60).toString().padStart(2,'0')}`
  }

  function selezionaTipologia(id: string) {
    setTipologiaId(id)
    const t = tipologie.find(t => t.id === id)
    if (t) setOraFine(calcolaFine(oraInizio, t.durata_minuti))
  }

  function aggiornaOraInizio(val: string) {
    setOraInizio(val)
    const t = tipologie.find(t => t.id === tipologiaId)
    if (t) setOraFine(calcolaFine(val, t.durata_minuti))
  }

  async function salva() {
    setSaving(true)
    let idCliente = clienteId
    let nomeCliente = ''
    if (nuovoCliente) {
      if (!cognomeNuovo.trim()) { setSaving(false); return }
      const { data } = await supabase.from('clienti').insert({ nome: nomeNuovo, cognome: cognomeNuovo }).select().single()
      if (data) { idCliente = data.id; nomeCliente = `${nomeNuovo} ${cognomeNuovo}` }
    } else {
      const c = clienti.find(c => c.id === clienteId)
      if (!c) { setSaving(false); return }
      nomeCliente = `${c.nome} ${c.cognome}`
    }
    const t = tipologie.find(t => t.id === tipologiaId)
    if (!tipologiaId) { setSaving(false); return }
    await supabase.from('appuntamenti').insert({
      cliente_id: idCliente,
      cliente_nome: nomeCliente,
      tipologia_id: tipologiaId,
      tipologia_nome: t?.nome,
      tipologia_colore: t?.colore,
      data, ora_inizio: oraInizio, ora_fine: oraFine,
      note, stato: 'programmato'
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nuovo Appuntamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Cliente *</label>
              <button onClick={() => setNuovoCliente(!nuovoCliente)} className="text-xs text-blue-600 hover:underline">
                {nuovoCliente ? '← Seleziona esistente' : '+ Nuovo cliente'}
              </button>
            </div>
            {nuovoCliente ? (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome" value={nomeNuovo} onChange={e => setNomeNuovo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Cognome *" value={cognomeNuovo} onChange={e => setCognomeNuovo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ) : (
              <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleziona cliente...</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia *</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input type="date" value={data} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
              <input type="time" value={oraInizio} onChange={e => aggiornaOraInizio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora fine</label>
              <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3} placeholder="Note aggiuntive..." />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Chiudi</button>
          <button onClick={salva} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}