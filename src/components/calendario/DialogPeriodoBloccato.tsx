'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface PeriodoBloccato {
  id: string
  tipo: string
  titolo: string
  data_inizio: string
  data_fine: string
  colore: string
  note: string
}

const TIPI = [
  { value: 'corso',   label: 'Corso',               emoji: '📚' },
  { value: 'privato', label: 'Appuntamento privato', emoji: '🔒' },
  { value: 'ferie',   label: 'Ferie',                emoji: '🏖️' },
  { value: 'altro',   label: 'Altro',                emoji: '📌' },
]

const COLORI_PRESET = [
  '#6366F1','#8B5CF6','#EC4899',
  '#F59E0B','#10B981','#3B82F6',
  '#EF4444','#64748B',
]

interface Props {
  onClose: () => void
  onSaved: () => void
  periodo?: PeriodoBloccato
  dataDefault?: string
}

export default function DialogPeriodoBloccato({ onClose, onSaved, periodo, dataDefault }: Props) {
  const oggi = new Date().toISOString().split('T')[0]
  const [tipo, setTipo] = useState(periodo?.tipo || 'corso')
  const [titolo, setTitolo] = useState(periodo?.titolo || '')
  const [dataInizio, setDataInizio] = useState(periodo?.data_inizio || dataDefault || oggi)
  const [dataFine, setDataFine] = useState(periodo?.data_fine || dataDefault || oggi)
  const [colore, setColore] = useState(periodo?.colore || '#6366F1')
  const [note, setNote] = useState(periodo?.note || '')
  const [saving, setSaving] = useState(false)
  const [confermElimina, setConfermElimina] = useState(false)

  function handleDataInizio(val: string) {
    setDataInizio(val)
    if (dataFine < val) setDataFine(val)
  }

  const labelAuto = TIPI.find(t => t.value === tipo)?.label || ''
  const nGiorni = Math.max(1, Math.floor((new Date(dataFine).getTime() - new Date(dataInizio).getTime()) / 86400000) + 1)

  async function salva() {
    if (!dataInizio || !dataFine) return
    setSaving(true)
    const dati = {
      tipo,
      titolo: titolo.trim() || labelAuto,
      data_inizio: dataInizio,
      data_fine: dataFine,
      colore,
      note: note || null,
    }
    if (periodo) {
      await supabase.from('periodi_bloccati').update(dati).eq('id', periodo.id)
    } else {
      await supabase.from('periodi_bloccati').insert(dati)
    }
    setSaving(false)
    onSaved()
  }

  async function elimina() {
    setSaving(true)
    await supabase.from('periodi_bloccati').delete().eq('id', periodo!.id)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {periodo ? 'Modifica blocco' : 'Blocca giornata / periodo'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPI.map(t => (
                <button key={t.value} onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${tipo === t.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)}
              placeholder={labelAuto}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
              <input type="date" value={dataInizio} onChange={e => handleDataInizio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
              <input type="date" value={dataFine} min={dataInizio} onChange={e => setDataFine(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600">
            <span>📅</span>
            <span className="font-medium">{nGiorni === 1 ? 'Giornata intera' : `${nGiorni} giorni`}</span>
            {nGiorni > 1 && <span className="text-gray-400">· {new Date(dataInizio+'T00:00:00').toLocaleDateString('it-IT')} → {new Date(dataFine+'T00:00:00').toLocaleDateString('it-IT')}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => setColore(c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-105 ${colore === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={colore} onChange={e => setColore(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 p-0 overflow-hidden" title="Personalizzato" />
            </div>
          </div>

          {/* Anteprima */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: colore+'20', borderLeft: `4px solid ${colore}`, color: colore }}>
            <span>{TIPI.find(t => t.value === tipo)?.emoji}</span>
            <span>{titolo || labelAuto}</span>
            {nGiorni > 1 && <span className="text-xs font-normal opacity-70">({nGiorni} giorni)</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2} placeholder="Note aggiuntive..." />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
            <button onClick={salva} disabled={saving}
              className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colore }}>
              {saving ? 'Salvataggio...' : periodo ? 'Salva modifiche' : 'Blocca periodo'}
            </button>
          </div>
          {periodo && !confermElimina && (
            <button onClick={() => setConfermElimina(true)}
              className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50">
              🗑 Rimuovi blocco
            </button>
          )}
          {periodo && confermElimina && (
            <div className="flex gap-2">
              <button onClick={() => setConfermElimina(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Annulla</button>
              <button onClick={elimina} disabled={saving} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">Conferma rimozione</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
