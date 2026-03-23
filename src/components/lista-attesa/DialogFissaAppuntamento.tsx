'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Props {
  richiesta: {
    id: string; cliente_nome: string; telefono: string; email: string
    tipo: string; appuntamento_id?: string
  }
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
    const [h, m] = inizio.split(':').map(Number)
    const tot = h * 60 + m + durata
    return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
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

    // 1. Recupera cliente_id dall'appuntamento originale se presente
    let clienteId: string | null = null
    if (richiesta.appuntamento_id) {
      const { data: apptOrig } = await supabase
        .from('appuntamenti').select('cliente_id').eq('id', richiesta.appuntamento_id).single()
      clienteId = apptOrig?.cliente_id || null
    }

    // 2. Crea il nuovo appuntamento come programmato
    await supabase.from('appuntamenti').insert({
      cliente_id: clienteId,
      cliente_nome: richiesta.cliente_nome,
      tipologia_id: tipologiaId,
      tipologia_nome: t?.nome,
      tipologia_colore: t?.colore,
      data, ora_inizio: oraInizio, ora_fine: oraFine,
      note, stato: 'programmato',
    })

    // 3. Elimina l'appuntamento originale grigio dal calendario (se c'era)
    if (richiesta.appuntamento_id) {
      await supabase.from('appuntamenti').delete().eq('id', richiesta.appuntamento_id)
    }

    // 4. Segna la richiesta come gestita
    await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', richiesta.id)

    setSaving(false); onSaved()
  }

  const tipSel = tipologie.find(t => t.id === tipologiaId)
  const isSlot = richiesta.tipo === 'slot_liberato'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isSlot ? 'Assegna slot liberato' : 'Fissa nuovo appuntamento'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info cliente */}
          <div className={`rounded-lg px-4 py-3 ${isSlot ? 'bg-green-50' : 'bg-blue-50'}`}>
            <p className={`font-medium ${isSlot ? 'text-green-800' : 'text-blue-800'}`}>{richiesta.cliente_nome}</p>
            <div className={`flex gap-4 mt-1 text-xs ${isSlot ? 'text-green-600' : 'text-blue-600'}`}>
              {richiesta.telefono && <span>📞 {richiesta.telefono}</span>}
              {richiesta.email && <span>✉️ {richiesta.email}</span>}
            </div>
          </div>

          {/* Tipologia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia *</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.durata_minuti} min</option>)}
            </select>
          </div>

          {/* Badge durata */}
          {tipSel && oraInizio && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600"
              style={{ backgroundColor: `${tipSel.colore}15`, borderLeft: `3px solid ${tipSel.colore}` }}>
              ℹ️ {tipSel.durata_minuti} min — fine alle <strong className="ml-1">{oraFine}</strong>
            </div>
          )}

          {/* Data + Ora */}
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

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2} placeholder="Note aggiuntive..." />
          </div>

          {/* Avviso appuntamento originale */}
          {richiesta.appuntamento_id && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ L'appuntamento originale verrà rimosso dal calendario e sostituito con quello nuovo.
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving || !data || !tipologiaId}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Conferma appuntamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
