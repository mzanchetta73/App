'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Props {
  richiesta: { id: string; cliente_nome: string; telefono: string; email: string; tipo: string }
  onClose: () => void
  onSaved: () => void
}

export default function DialogFissaAppuntamento({ richiesta, onClose, onSaved }: Props) {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [tipologiaId, setTipologiaId] = useState('')
  const [data, setData] = useState('')
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('10:00')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
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
    if (!data || !tipologiaId) return
    setSaving(true)
    const t = tipologie.find(t => t.id === tipologiaId)
    await supabase.from('appuntamenti').insert({
      cliente_nome: richiesta.cliente_nome,
      tipologia_id: tipologiaId,
      tipologia_nome: t?.nome,
      tipologia_colore: t?.colore,
      data,
      ora_inizio: oraInizio,
      ora_fine: oraFine,
      note,
      stato: 'in_attesa_conferma'
    })
    await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', richiesta.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Fissa appuntamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg px-4 py-3">
            <p className="font-medium text-blue-800">{richiesta.cliente_nome}</p>
            <div className="flex gap-4 mt-1 text-xs text-blue-600">
              {richiesta.telefono && <span>📞 {richiesta.telefono}</span>}
              {richiesta.email && <span>✉️ {richiesta.email}</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia *</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora inizio</label>
              <input type="time" value={oraInizio} onChange={e => aggiornaOraInizio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3} placeholder="Note aggiuntive..." />
          </div>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}