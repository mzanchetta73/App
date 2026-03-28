'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TipologiaBlocco {
  id: string
  nome: string
  ora_inizio: string | null
  ora_fine: string | null
  colore: string
  note: string | null
}

interface Props {
  onClose: () => void
  onSaved: () => void
  tipologia?: TipologiaBlocco
}

const COLORI_PRESET = [
  '#6366F1','#8B5CF6','#EC4899',
  '#F59E0B','#10B981','#3B82F6',
  '#EF4444','#64748B',
]

export default function DialogTipologiaBlocco({ onClose, onSaved, tipologia }: Props) {
  const [nome, setNome] = useState(tipologia?.nome || '')
  const [colore, setColore] = useState(tipologia?.colore || '#6366F1')
  const [note, setNote] = useState(tipologia?.note || '')
  const [saving, setSaving] = useState(false)

  const [soloOrario, setSoloOrario] = useState(!!(tipologia?.ora_inizio))
  const [oraInizio, setOraInizio] = useState(tipologia?.ora_inizio?.substring(0, 5) || '09:00')
  const [oraFine, setOraFine] = useState(tipologia?.ora_fine?.substring(0, 5) || '18:00')

  async function salva() {
    if (!nome.trim()) return
    setSaving(true)
    const dati = {
      nome: nome.trim(),
      colore,
      note: note || null,
      ora_inizio: soloOrario ? oraInizio : null,
      ora_fine: soloOrario ? oraFine : null,
    }
    if (tipologia) {
      await supabase.from('tipologie_blocco').update(dati).eq('id', tipologia.id)
    } else {
      await supabase.from('tipologie_blocco').insert(dati)
    }
    setSaving(false)
    onSaved()
  }

  // Calcola durata
  const durata = (() => {
    if (!soloOrario) return null
    const [h1, m1] = oraInizio.split(':').map(Number)
    const [h2, m2] = oraFine.split(':').map(Number)
    const dur = h2 * 60 + m2 - (h1 * 60 + m1)
    if (dur <= 0) return null
    return dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}min` : ''}` : `${dur}min`
  })()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {tipologia ? 'Modifica tipo blocco' : 'Nuovo tipo blocco'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Es. Corso, Riunione, Chiusura..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* Orario */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
              <input type="checkbox" checked={soloOrario} onChange={e => setSoloOrario(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm font-medium text-gray-700">Orario specifico</span>
              {!soloOrario && <span className="text-xs text-gray-400">(default: giornata intera)</span>}
            </label>

            {soloOrario && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora inizio</label>
                  <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora fine</label>
                  <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                {durata && (
                  <div className="col-span-2 px-3 py-2 rounded-lg text-xs text-gray-600"
                    style={{ backgroundColor: colore + '15', borderLeft: `3px solid ${colore}` }}>
                    {oraInizio} – {oraFine} · <strong>{durata}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Colore */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORI_PRESET.map(c => (
                <button key={c} onClick={() => setColore(c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-105
                    ${colore === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={colore} onChange={e => setColore(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 p-0 overflow-hidden" />
            </div>
          </div>

          {/* Anteprima */}
          {nome && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colore + '20', borderLeft: `4px solid ${colore}`, color: colore }}>
              <span>{nome}</span>
              {soloOrario && durata && <span className="text-xs font-normal opacity-70">{oraInizio}–{oraFine} ({durata})</span>}
              {!soloOrario && <span className="text-xs font-normal opacity-70">Giornata intera</span>}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2} placeholder="Note opzionali..." />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving || !nome.trim()}
            className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colore }}>
            {saving ? 'Salvataggio...' : tipologia ? 'Salva modifiche' : 'Crea tipo'}
          </button>
        </div>
      </div>
    </div>
  )
}
