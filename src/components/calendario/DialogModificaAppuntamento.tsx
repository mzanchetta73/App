'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Appuntamento {
  id: string; cliente_nome: string; tipologia_id: string; tipologia_nome: string
  tipologia_colore: string; data: string; ora_inizio: string; ora_fine: string
  note: string; stato: string
}
interface Props { appuntamento: Appuntamento; onClose: () => void; onSaved: () => void }

export default function DialogModificaAppuntamento({ appuntamento, onClose, onSaved }: Props) {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [tipologiaId, setTipologiaId] = useState(appuntamento.tipologia_id || '')
  const [oraInizio, setOraInizio] = useState(appuntamento.ora_inizio)
  const [oraFine, setOraFine] = useState(appuntamento.ora_fine)
  const [note, setNote] = useState(appuntamento.note || '')
  const [stato, setStato] = useState(appuntamento.stato)
  const [saving, setSaving] = useState(false)
  const [confermElimina, setConfermElimina] = useState(false)

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
    setSaving(true)
    const t = tipologie.find(t => t.id === tipologiaId)
    await supabase.from('appuntamenti').update({
      tipologia_id: tipologiaId, tipologia_nome: t?.nome, tipologia_colore: t?.colore,
      ora_inizio: oraInizio, ora_fine: oraFine, note, stato,
    }).eq('id', appuntamento.id)

    // Se si imposta in_attesa_spostamento → crea voce in lista_attesa
    if (stato === 'in_attesa_spostamento' && appuntamento.stato !== 'in_attesa_spostamento') {
      const { data: es } = await supabase.from('lista_attesa').select('id').eq('appuntamento_id', appuntamento.id).maybeSingle()
      if (!es) {
        await supabase.from('lista_attesa').insert({
          tipo: 'spostamento', tipo_richiesta: 'spostamento',
          appuntamento_id: appuntamento.id, cliente_nome: appuntamento.cliente_nome,
          stato: 'in_attesa', data_richiesta: new Date().toISOString().split('T')[0],
        })
      }
    }

    // Se si imposta cancellato → crea slot liberato
    if (stato === 'cancellato' && appuntamento.stato !== 'cancellato') {
      await supabase.from('lista_attesa').insert({
        tipo: 'slot_liberato', tipo_richiesta: 'slot_liberato',
        appuntamento_id: appuntamento.id, cliente_nome: appuntamento.cliente_nome,
        stato: 'in_attesa', data_richiesta: new Date().toISOString().split('T')[0],
        mese_preferito: appuntamento.data.substring(0, 7),
      })
    }

    setSaving(false); onSaved()
  }

  async function elimina() {
    await supabase.from('appuntamenti').delete().eq('id', appuntamento.id)
    onSaved()
  }

  const tipSel = tipologie.find(t => t.id === tipologiaId)
  const durataInfo = tipSel ? `${tipSel.durata_minuti} min — fine alle ${oraFine}` : null

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
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.durata_minuti} min</option>)}
            </select>
          </div>
          {durataInfo && (
            <div className="px-3 py-2 rounded-lg text-sm text-gray-600"
              style={{ backgroundColor: `${tipSel?.colore}15`, borderLeft: `3px solid ${tipSel?.colore}` }}>
              ℹ️ {durataInfo}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
              {new Date(appuntamento.data + 'T00:00:00').toLocaleDateString('it-IT')}
            </p>
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
              <option value="cancellato">Annullato</option>
              <option value="in_attesa_spostamento">In attesa spostamento</option>
            </select>
          </div>
          {stato === 'in_attesa_spostamento' && appuntamento.stato !== 'in_attesa_spostamento' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ Salvando, verrà aggiunto automaticamente a Lista d'attesa → Spostamenti.
            </div>
          )}
          {stato === 'cancellato' && appuntamento.stato !== 'cancellato' && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
              ⚠️ Lo slot liberato apparirà in Lista d'attesa → Slot liberati.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3} placeholder="Note aggiuntive..." />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annulla</button>
            <button onClick={salva} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
          {!confermElimina ? (
            <button onClick={() => setConfermElimina(true)} className="w-full px-4 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
              🗑 Elimina appuntamento
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfermElimina(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annulla</button>
              <button onClick={elimina} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Conferma eliminazione</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
