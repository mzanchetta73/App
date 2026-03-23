'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente { id: string; nome: string; cognome: string }
interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }

interface Props {
  data: string
  onClose: () => void
  onSaved: () => void
  clientePreselezionato?: { id: string; nome: string; cognome: string }
}

export default function DialogAppuntamento({ data, onClose, onSaved, clientePreselezionato }: Props) {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [clienteId, setClienteId] = useState(clientePreselezionato?.id || '')
  const [nuovoCliente, setNuovoCliente] = useState(false)
  const [nomeNuovo, setNomeNuovo] = useState('')
  const [cognomeNuovo, setCognomeNuovo] = useState('')
  const [tipologiaId, setTipologiaId] = useState('')
  const [dataApp, setDataApp] = useState(data)
  const [oraInizio, setOraInizio] = useState('09:00')
  const [oraFine, setOraFine] = useState('10:00')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    supabase.from('clienti').select('id,nome,cognome').order('cognome')
      .then(({ data }) => { if (data) setClienti(data) })
    supabase.from('tipologie').select('*').order('nome')
      .then(({ data }) => { if (data) setTipologie(data) })
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
    setErrore('')
    setSaving(true)

    // Controlla se il giorno è bloccato
    const { data: blocchi } = await supabase.from('periodi_bloccati')
      .select('titolo').lte('data_inizio', dataApp).gte('data_fine', dataApp).limit(1)
    if (blocchi && blocchi.length > 0) {
      setErrore(`Giornata bloccata: "${blocchi[0].titolo}". Non è possibile inserire appuntamenti in questo periodo.`)
      setSaving(false); return
    }

    // Controlla sovrapposizione
    const { data: overlap } = await supabase.from('appuntamenti')
      .select('id,cliente_nome,ora_inizio,ora_fine')
      .eq('data', dataApp)
      .neq('stato', 'cancellato')
      .lt('ora_inizio', oraFine)
      .gt('ora_fine', oraInizio)
    if (overlap && overlap.length > 0) {
      const o = overlap[0]
      setErrore(`Sovrapposizione con: ${o.cliente_nome} (${o.ora_inizio}–${o.ora_fine}). Scegli un orario libero.`)
      setSaving(false); return
    }

    let idCliente = clienteId
    let nomeCliente = ''

    if (nuovoCliente) {
      if (!cognomeNuovo.trim()) { setErrore('Inserisci il cognome'); setSaving(false); return }
      const { data } = await supabase.from('clienti').insert({ nome: nomeNuovo, cognome: cognomeNuovo }).select().single()
      if (data) { idCliente = data.id; nomeCliente = `${nomeNuovo} ${cognomeNuovo}` }
    } else if (clientePreselezionato && !clienteId) {
      idCliente = clientePreselezionato.id
      nomeCliente = `${clientePreselezionato.nome} ${clientePreselezionato.cognome}`
    } else {
      const c = clienti.find(c => c.id === clienteId)
      if (!c) { setErrore('Seleziona un cliente'); setSaving(false); return }
      nomeCliente = `${c.nome} ${c.cognome}`
    }

    if (!tipologiaId) { setErrore('Seleziona una tipologia'); setSaving(false); return }
    const t = tipologie.find(t => t.id === tipologiaId)

    await supabase.from('appuntamenti').insert({
      cliente_id: idCliente, cliente_nome: nomeCliente,
      tipologia_id: tipologiaId, tipologia_nome: t?.nome, tipologia_colore: t?.colore,
      data: dataApp, ora_inizio: oraInizio, ora_fine: oraFine, note, stato: 'programmato',
    })
    setSaving(false); onSaved()
  }

  const tipSel = tipologie.find(t => t.id === tipologiaId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Nuovo Appuntamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              {!clientePreselezionato && (
                <button onClick={() => setNuovoCliente(!nuovoCliente)} className="text-xs text-blue-600 hover:underline">
                  {nuovoCliente ? '← Seleziona esistente' : '+ Nuovo cliente'}
                </button>
              )}
            </div>
            {clientePreselezionato ? (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium">
                ✓ {clientePreselezionato.nome} {clientePreselezionato.cognome}
              </div>
            ) : nuovoCliente ? (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome" value={nomeNuovo} onChange={e => setNomeNuovo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Cognome *" value={cognomeNuovo} onChange={e => setCognomeNuovo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ) : (
              <select value={clienteId} onChange={e => setClienteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleziona cliente</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>)}
              </select>
            )}
          </div>

          {/* Tipologia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          {tipSel && (
            <div className="px-3 py-2 rounded-lg text-xs text-gray-600"
              style={{ backgroundColor: `${tipSel.colore}15`, borderLeft: `3px solid ${tipSel.colore}` }}>
              ℹ️ {tipSel.durata_minuti} min — fine alle {calcolaFine(oraInizio, tipSel.durata_minuti)}
            </div>
          )}

          {/* Data + Ora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" value={dataApp} onChange={e => setDataApp(e.target.value)}
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

          {errore && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 flex items-start gap-2">
              <span className="shrink-0">⚠️</span><span>{errore}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Chiudi</button>
          <button onClick={salva} disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
