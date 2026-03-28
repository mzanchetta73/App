'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface PeriodoBloccato {
  id: string
  tipo: string
  titolo: string
  data_inizio: string
  data_fine: string
  ora_inizio?: string | null
  ora_fine?: string | null
  colore: string
  note: string
}

interface TipologiaBlocco {
  id: string
  nome: string
  ora_inizio: string | null
  ora_fine: string | null
  colore: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
  periodo?: PeriodoBloccato
  dataDefault?: string
}

const COLORI_PRESET = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#64748B']

export default function DialogPeriodoBloccato({ onClose, onSaved, periodo, dataDefault }: Props) {
  const oggi = new Date().toISOString().split('T')[0]
  const [tipi, setTipi] = useState<TipologiaBlocco[]>([])
  const [tipoId, setTipoId] = useState('')
  const [titolo, setTitolo] = useState(periodo?.titolo || '')
  const [dataInizio, setDataInizio] = useState(periodo?.data_inizio || dataDefault || oggi)
  const [dataFine, setDataFine] = useState(periodo?.data_fine || dataDefault || oggi)
  const [colore, setColore] = useState(periodo?.colore || '#6366F1')
  const [note, setNote] = useState(periodo?.note || '')
  const [soloOrario, setSoloOrario] = useState(!!(periodo?.ora_inizio))
  const [oraInizio, setOraInizio] = useState(periodo?.ora_inizio?.substring(0, 5) || '09:00')
  const [oraFine, setOraFine] = useState(periodo?.ora_fine?.substring(0, 5) || '18:00')
  const [saving, setSaving] = useState(false)
  const [confermElimina, setConfermElimina] = useState(false)

  useEffect(() => {
    supabase.from('tipologie_blocco').select('*').order('nome')
      .then(({ data }) => { if (data) setTipi(data as TipologiaBlocco[]) })
  }, [])

  function handleDataInizio(val: string) {
    setDataInizio(val)
    if (dataFine < val) setDataFine(val)
  }

  function selezionaTipo(id: string) {
    setTipoId(id)
    const t = tipi.find(t => t.id === id)
    if (!t) return
    setColore(t.colore)
    if (!titolo) setTitolo(t.nome)
    if (t.ora_inizio) {
      setSoloOrario(true)
      setOraInizio(t.ora_inizio.substring(0, 5))
      setOraFine((t.ora_fine || '18:00').substring(0, 5))
    } else {
      setSoloOrario(false)
    }
  }

  const nGiorni = Math.max(1, Math.floor((new Date(dataFine).getTime() - new Date(dataInizio).getTime()) / 86400000) + 1)

  const durata = (() => {
    if (!soloOrario) return null
    const [h1, m1] = oraInizio.split(':').map(Number)
    const [h2, m2] = oraFine.split(':').map(Number)
    const dur = h2 * 60 + m2 - (h1 * 60 + m1)
    if (dur <= 0) return null
    return dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}min` : ''}` : `${dur}min`
  })()

  async function salva() {
    if (!dataInizio || !dataFine) return
    setSaving(true)
    const tipoSel = tipi.find(t => t.id === tipoId)
    const dati: any = {
      tipo: tipoSel?.nome || titolo || 'blocco',
      titolo: titolo.trim() || tipoSel?.nome || 'Blocco',
      data_inizio: dataInizio,
      data_fine: dataFine,
      colore,
      note: note || null,
      ora_inizio: soloOrario ? oraInizio : null,
      ora_fine: soloOrario ? oraFine : null,
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

  const titoloPreview = titolo || tipi.find(t => t.id === tipoId)?.nome || 'Blocco'

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

          {/* Selezione tipo */}
          {tipi.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo blocco</label>
              <div className="grid grid-cols-2 gap-2">
                {tipi.map(t => (
                  <button key={t.id} onClick={() => selezionaTipo(t.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left
                      ${tipoId === t.id ? 'border-2 font-medium shadow-sm' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    style={tipoId === t.id ? { borderColor: t.colore, backgroundColor: t.colore+'15', color: t.colore } : {}}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.colore }} />
                    <div className="min-w-0">
                      <div className="truncate">{t.nome}</div>
                      <div className="text-[10px] opacity-60">
                        {t.ora_inizio ? `${t.ora_inizio.substring(0,5)}–${(t.ora_fine||'').substring(0,5)}` : 'Giornata intera'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Gestisci i tipi in <strong>Tipologie → Tipi Blocca Giornata</strong></p>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700">
              Nessun tipo definito. Vai in <strong>Tipologie → Tipi Blocca Giornata</strong> per crearne.
            </div>
          )}

          {/* Titolo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)}
              placeholder={tipi.find(t => t.id === tipoId)?.nome || 'Titolo del blocco...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Date */}
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

          {/* Orario */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={soloOrario} onChange={e => setSoloOrario(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Blocca solo alcune ore</span>
            </label>
            {soloOrario && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora inizio</label>
                  <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ora fine</label>
                  <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {durata && (
                  <div className="col-span-2 px-3 py-2 rounded-lg text-xs text-gray-600"
                    style={{ backgroundColor: colore+'15', borderLeft: `3px solid ${colore}` }}>
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
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-105 ${colore === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={colore} onChange={e => setColore(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border border-gray-200 p-0 overflow-hidden" />
            </div>
          </div>

          {/* Anteprima */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: colore+'20', borderLeft: `4px solid ${colore}`, color: colore }}>
            <span>{titoloPreview}</span>
            {soloOrario && <span className="text-xs font-normal opacity-70">{oraInizio}–{oraFine}</span>}
            {nGiorni > 1 && <span className="text-xs font-normal opacity-70">({nGiorni} giorni)</span>}
          </div>

          {/* Note */}
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
              Rimuovi blocco
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
