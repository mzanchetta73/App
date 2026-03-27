'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }
interface Cliente { id: string; nome: string; cognome: string; telefono: string; email: string }

interface Props {
  richiesta: {
    id: string
    cliente_nome: string
    telefono: string
    email: string
    tipo: string
    appuntamento_id?: string
    appuntamento?: { data: string; ora_inizio: string; ora_fine: string; tipologia_nome: string; tipologia_colore: string }
    _appuntamento?: { data: string; ora_inizio: string; ora_fine: string; tipologia_nome: string; tipologia_colore: string }
  }
  onClose: () => void
  onSaved: () => void
}

export default function DialogFissaAppuntamento({ richiesta, onClose, onSaved }: Props) {
  const isSlot = richiesta.tipo === 'slot_liberato'
  const appDati = richiesta._appuntamento || richiesta.appuntamento

  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [tipologiaId, setTipologiaId] = useState('')
  const [data, setData] = useState(appDati?.data || '')
  const [oraInizio, setOraInizio] = useState((appDati?.ora_inizio || '09:00').substring(0, 5))
  const [oraFine, setOraFine] = useState((appDati?.ora_fine || '10:00').substring(0, 5))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteNomeInput, setClienteNomeInput] = useState('')

  useEffect(() => {
    supabase.from('tipologie').select('*').order('nome')
      .then(({ data: d }) => {
        if (d) {
          setTipologie(d)
          if (appDati?.tipologia_nome) {
            const t = d.find((t: Tipologia) => t.nome === appDati.tipologia_nome)
            if (t) setTipologiaId(t.id)
          }
        }
      })
    if (isSlot) {
      supabase.from('clienti').select('id,nome,cognome,telefono,email').order('nome')
        .then(({ data: d }) => { if (d) setClienti(d) })
    }
  }, [])

  function calcolaFine(inizio: string, durata: number) {
    const [h, m] = inizio.split(':').map(Number)
    const tot = h * 60 + m + durata
    return `${Math.floor(tot / 60).toString().padStart(2, '0')}:${(tot % 60).toString().padStart(2, '0')}`
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
    if (!data) { setErrore('Inserisci la data'); return }
    if (!tipologiaId) { setErrore('Seleziona la tipologia'); return }

    let nomeCliente = richiesta.cliente_nome
    let idCliente: string | null = null

    if (isSlot) {
      if (!clienteId && !clienteNomeInput.trim()) {
        setErrore('Seleziona il cliente'); return
      }
      if (clienteId) {
        const c = clienti.find(c => c.id === clienteId)
        if (c) { nomeCliente = `${c.nome} ${c.cognome}`; idCliente = clienteId }
      } else {
        nomeCliente = clienteNomeInput.trim()
      }
    }

    setSaving(true)

    const t = tipologie.find(t => t.id === tipologiaId)

    // STEP 1: Crea nuovo appuntamento
    await supabase.from('appuntamenti').insert({
      cliente_id: idCliente,
      cliente_nome: nomeCliente,
      tipologia_id: tipologiaId,
      tipologia_nome: t?.nome,
      tipologia_colore: t?.colore,
      data,
      ora_inizio: oraInizio,
      ora_fine: oraFine,
      note,
      stato: 'programmato',
    })

    // STEP 2: Elimina appuntamento grigio — tre strategie in ordine di priorità

    // Strategia A: per data+ora originale (più precisa, funziona quando appDati è disponibile)
    const dataOrig = appDati?.data
    const oraOrig = appDati?.ora_inizio?.substring(0, 5)
    if (dataOrig && oraOrig) {
      const { data: grigi } = await supabase
        .from('appuntamenti')
        .select('id')
        .eq('stato', 'in_attesa_spostamento')
        .eq('data', dataOrig)
        .like('ora_inizio', oraOrig + '%')
      if (grigi && grigi.length > 0) {
        for (const g of grigi) {
          await supabase.from('appuntamenti').delete().eq('id', g.id)
        }
      }
    }

    // Strategia B: per appuntamento_id diretto (quando disponibile)
    const appOrigId = richiesta.appuntamento_id
    if (appOrigId && appOrigId !== '__from_calendario__') {
      await supabase.from('appuntamenti').delete().eq('id', appOrigId)
    }

    // Strategia C: per cliente_nome + stato (fallback quando appDati e appOrigId sono null)
    // Copre il caso lista_attesa con appuntamento_id NULL senza dati appuntamento
    if (!dataOrig && !appOrigId) {
      await supabase.from('appuntamenti')
        .delete()
        .eq('cliente_nome', richiesta.cliente_nome)
        .eq('stato', 'in_attesa_spostamento')
    }

    // STEP 3: Segna lista_attesa come gestita
    if (richiesta.id && richiesta.id !== '__from_calendario__') {
      await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', richiesta.id)
    } else {
      await supabase.from('lista_attesa')
        .update({ stato: 'gestito' })
        .eq('cliente_nome', richiesta.cliente_nome)
        .eq('tipo', 'spostamento')
        .eq('stato', 'in_attesa')
    }

    setSaving(false)
    onSaved()
  }

  const tipSel = tipologie.find(t => t.id === tipologiaId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {isSlot ? 'Assegna appuntamento liberato' : 'Fissa appuntamento'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {isSlot ? (
            <>
              {appDati && (
                <div className="rounded-lg px-4 py-3 text-sm bg-green-50 border border-green-200">
                  <p className="font-semibold text-gray-700 mb-1">Slot disponibile</p>
                  <p className="text-xs text-gray-600">
                    {appDati.data ? new Date(appDati.data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                    {' · '}{(appDati.ora_inizio || '').substring(0, 5)}–{(appDati.ora_fine || '').substring(0, 5)}
                  </p>
                  <p className="text-xs mt-0.5 font-medium text-green-700">{appDati.tipologia_nome}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assegna a cliente *</label>
                <input type="text" placeholder="Cerca cliente..." list="clienti-fissa-list"
                  value={clienteNomeInput}
                  onChange={e => {
                    setClienteNomeInput(e.target.value); setClienteId('')
                    const c = clienti.find(c => `${c.cognome} ${c.nome}` === e.target.value)
                    if (c) { setClienteId(c.id); setClienteNomeInput(`${c.cognome} ${c.nome}`) }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id="clienti-fissa-list">
                  {clienti.map(c => <option key={c.id} value={`${c.cognome} ${c.nome}`} />)}
                </datalist>
              </div>
            </>
          ) : (
            <div className="bg-blue-50 rounded-lg px-4 py-3">
              <p className="font-medium text-blue-800">{richiesta.cliente_nome}</p>
              <div className="flex gap-4 mt-1 text-xs text-blue-600">
                {richiesta.telefono && <span>📞 {richiesta.telefono}</span>}
                {richiesta.email && <span>✉️ {richiesta.email}</span>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia *</label>
            <select value={tipologiaId} onChange={e => selezionaTipologia(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.durata_minuti} min</option>)}
            </select>
          </div>

          {tipSel && (
            <div className="px-3 py-2 rounded-lg text-xs text-gray-600"
              style={{ backgroundColor: `${tipSel.colore}15`, borderLeft: `3px solid ${tipSel.colore}` }}>
              ℹ️ {tipSel.durata_minuti} min — fine alle <strong className="ml-1">{oraFine}</strong>
            </div>
          )}

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
              rows={2} placeholder="Note aggiuntive..." />
          </div>

          {errore && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              ⚠️ {errore}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving || !data || !tipologiaId}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : isSlot ? 'Assegna appuntamento' : 'Conferma appuntamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
