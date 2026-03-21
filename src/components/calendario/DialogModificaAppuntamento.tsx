'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Appuntamento { id: string; cliente_nome: string; tipologia_id: string; tipologia_nome: string; tipologia_colore: string; data: string; ora_inizio: string; ora_fine: string; note: string; stato: string }
interface Props { appuntamento: Appuntamento; onClose: () => void; onSaved: () => void }

export default function DialogModificaAppuntamento({ appuntamento, onClose, onSaved }: Props) {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [tipologiaId, setTipologiaId] = useState(appuntamento.tipologia_id || '')
  const [oraInizio, setOraInizio] = useState(appuntamento.ora_inizio)
  const [oraFine, setOraFine] = useState(appuntamento.ora_fine)
  const [note, setNote] = useState(appuntamento.note || '')
  const [stato, setStato] = useState(appuntamento.stato)
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
    setSaving(true)
    const t = tipologie.find(t => t.id === tipologiaId)
    await supabase.from('appuntamenti').update({
      tipologia_id: tipologiaId,
      tipologia_nome: t?.nome,
      tipologia_colore: t?.colore,
      ora_inizio: oraInizio,
      ora_fine: oraFine,
      note,
      stato
    }).eq('id', appuntamento.id)
    setSaving(false)
    onSaved()
  }

  async function elimina() {
    if (!confirm('Eliminare questo appuntamento?')) return
    await supabase.from('appuntamenti').delete().eq('id', appuntamento.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Modifica Appuntamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{appuntamento.cliente_nome}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">{new Date(appuntamento.data).toLocaleDateString('it-IT')}</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select value={stato} onChange={e => setStato(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="programmato">Programmato</option>
              <option value="completato">Completato</option>
              <option value="cancellato">Cancellato</option>
              <option value="in_attesa_spostamento">In attesa spostamento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3} placeholder="Note aggiuntive..." />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={elimina} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Elimina</button>
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}