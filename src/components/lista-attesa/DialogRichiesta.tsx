'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente { id: string; nome: string; cognome: string; telefono: string; email: string }
interface Tipologia { id: string; nome: string; colore: string; durata_minuti: number }
interface AppLiberato {
  id: string // id lista_attesa
  appuntamento_id?: string
  note?: string
  appuntamento?: {
    data: string; ora_inizio: string; ora_fine: string
    tipologia_nome: string; tipologia_colore: string; tipologia_id: string
  }
}

interface Props {
  onClose: () => void
  onSaved: () => void
  richiesta?: {
    id: string; tipo: string; tipo_richiesta: string; tipologia_id: string
    cliente_nome: string; telefono: string; email: string; note: string
    data_richiesta: string; mese_preferito: string; appuntamento_id?: string
  }
}

export default function DialogRichiesta({ onClose, onSaved, richiesta }: Props) {
  const isModifica = !!(richiesta?.id && richiesta.id.trim() !== '')
  const [tipo, setTipo] = useState<'nuovo_cliente'|'spostamento'>(
    richiesta?.tipo === 'spostamento' ? 'spostamento' : 'nuovo_cliente'
  )
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [appLiberati, setAppLiberati] = useState<AppLiberato[]>([])
  const [slotSelezionato, setSlotSelezionato] = useState<AppLiberato|null>(null)

  const [clienteId, setClienteId] = useState('')
  const [clienteNomeInput, setClienteNomeInput] = useState(richiesta?.tipo === 'spostamento' ? richiesta.cliente_nome : '')
  const [tipoRichiesta, setTipoRichiesta] = useState(richiesta?.tipo_richiesta || '')
  const [nome, setNome] = useState(richiesta?.tipo === 'nuovo_cliente' ? (richiesta.cliente_nome.split(' ')[0] || '') : '')
  const [cognome, setCognome] = useState(richiesta?.tipo === 'nuovo_cliente' ? (richiesta.cliente_nome.split(' ').slice(1).join(' ') || '') : '')
  const [telefono, setTelefono] = useState(richiesta?.telefono || '')
  const [email, setEmail] = useState(richiesta?.email || '')
  const [dataRichiesta, setDataRichiesta] = useState(richiesta?.data_richiesta || new Date().toISOString().split('T')[0])
  const [mesePreferito, setMesePreferito] = useState(richiesta?.mese_preferito || '')
  const [dataAppuntamento, setDataAppuntamento] = useState('')
  const [oraAppuntamento, setOraAppuntamento] = useState('')
  const [tipologiaId, setTipologiaId] = useState(richiesta?.tipologia_id || '')
  const [note, setNote] = useState(richiesta?.note || '')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    supabase.from('clienti').select('id,nome,cognome,telefono,email').order('cognome')
      .then(({ data }) => { if (data) setClienti(data) })
    supabase.from('tipologie').select('id,nome,colore,durata_minuti').order('nome')
      .then(({ data }) => { if (data) setTipologie(data) })

    // Carica appuntamenti liberati disponibili
    supabase.from('lista_attesa')
      .select('id, appuntamento_id, note, appuntamento:appuntamento_id(data,ora_inizio,ora_fine,tipologia_nome,tipologia_colore,tipologia_id)')
      .eq('tipo', 'slot_liberato')
      .eq('stato', 'in_attesa')
      .order('data_richiesta', { ascending: true })
      .then(({ data }) => { if (data) setAppLiberati(data as AppLiberato[]) })

    if (richiesta?.appuntamento_id) {
      supabase.from('appuntamenti').select('tipologia_id,cliente_nome')
        .eq('id', richiesta.appuntamento_id).single()
        .then(({ data }) => {
          if (data?.tipologia_id) setTipologiaId(data.tipologia_id)
          if (data?.cliente_nome && !clienteNomeInput) setClienteNomeInput(data.cliente_nome)
        })
    }
  }, [])

  function selezionaCliente(id: string) {
    setClienteId(id)
    const c = clienti.find(c => c.id === id)
    if (c) { setTelefono(c.telefono || ''); setEmail(c.email || '') }
  }

  // Quando si seleziona uno slot liberato, precompila data/ora/tipologia
  function selezionaSlot(sl: AppLiberato) {
    if (slotSelezionato?.id === sl.id) { setSlotSelezionato(null); return }
    setSlotSelezionato(sl)
    if (sl.appuntamento) {
      setDataAppuntamento(sl.appuntamento.data)
      setOraAppuntamento(sl.appuntamento.ora_inizio)
      if (sl.appuntamento.tipologia_id) setTipologiaId(sl.appuntamento.tipologia_id)
    }
  }

  function calcolaFine(inizio: string, durataMin: number) {
    const [h, m] = inizio.split(':').map(Number)
    const tot = h * 60 + m + durataMin
    return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
  }

  async function salva() {
    setErrore('')
    setSaving(true)
    try {
      let nomeCliente = ''
      let idCliente: string | null = null

      if (tipo === 'nuovo_cliente') {
        if (!nome.trim() && !cognome.trim()) {
          setErrore('Inserisci almeno il nome o il cognome'); setSaving(false); return
        }
        nomeCliente = `${nome} ${cognome}`.trim()
        if (!isModifica) {
          const { data: nc } = await supabase.from('clienti')
            .insert({ nome, cognome, telefono, email })
            .select().single()
          if (nc) idCliente = nc.id
        }
      } else {
        if (clienteId) {
          const c = clienti.find(c => c.id === clienteId)
          if (c) { nomeCliente = `${c.nome} ${c.cognome}`; idCliente = clienteId }
        }
        if (!nomeCliente) nomeCliente = clienteNomeInput.trim()
        if (!nomeCliente) { setErrore('Seleziona o inserisci il nome del cliente'); setSaving(false); return }
      }

      // Se data+ora selezionati, crea appuntamento nel calendario
      let appCreato = false
      if (dataAppuntamento && oraAppuntamento && tipologiaId) {
        const tip = tipologie.find(t => t.id === tipologiaId)
        const oraFine = tip ? calcolaFine(oraAppuntamento, tip.durata_minuti) : ''

        // Controlla sovrapposizione
        const { data: overlap } = await supabase.from('appuntamenti')
          .select('id').eq('data', dataAppuntamento)
          .neq('stato', 'cancellato')
          .lt('ora_inizio', oraFine || oraAppuntamento)
          .gt('ora_fine', oraAppuntamento)
        if (overlap && overlap.length > 0) {
          setErrore(`Attenzione: esiste già un appuntamento in questo orario (${oraAppuntamento}–${oraFine}).`)
          setSaving(false); return
        }

        await supabase.from('appuntamenti').insert({
          cliente_id: idCliente,
          cliente_nome: nomeCliente,
          tipologia_id: tipologiaId,
          tipologia_nome: tip?.nome,
          tipologia_colore: tip?.colore,
          data: dataAppuntamento,
          ora_inizio: oraAppuntamento,
          ora_fine: oraFine,
          stato: 'programmato',
        })
        appCreato = true
      }

      const dati: Record<string, any> = {
        tipo, tipo_richiesta: tipo === 'spostamento' ? (tipoRichiesta || 'spostamento') : null,
        tipologia_id: tipologiaId || null,
        cliente_nome: nomeCliente, telefono: telefono || null, email: email || null,
        note: note || null, mese_preferito: mesePreferito || null,
        stato: appCreato ? 'gestito' : 'in_attesa', // diventa gestito se è stato creato l'appuntamento
        data_richiesta: dataRichiesta,
      }
      if (richiesta?.appuntamento_id) dati.appuntamento_id = richiesta.appuntamento_id

      if (isModifica) {
        await supabase.from('lista_attesa').update(dati).eq('id', richiesta!.id)
      } else {
        await supabase.from('lista_attesa').insert(dati)
      }

      // Se è stato selezionato uno slot liberato, segnarlo come gestito
      if (slotSelezionato) {
        await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', slotSelezionato.id)
      }

      setSaving(false); onSaved()
    } catch (err: any) {
      setErrore(err?.message || 'Errore durante il salvataggio'); setSaving(false)
    }
  }

  const tipologiaSelezionata = tipologie.find(t => t.id === tipologiaId)
  const mostraPannelloSlot = (tipo === 'nuovo_cliente' || tipo === 'spostamento') && appLiberati.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{isModifica ? 'Modifica richiesta' : 'Nuova richiesta'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Pannello principale ── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center gap-2 ${tipo === 'nuovo_cliente' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
              {tipo === 'nuovo_cliente' ? '👤 Nuovo cliente' : '🔄 Spostamento/Richiesta'}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="nuovo_cliente">Nuovo cliente</option>
                <option value="spostamento">Spostamento / Richiesta appuntamento</option>
              </select>
            </div>

            {tipo === 'spostamento' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo richiesta</label>
                <select value={tipoRichiesta} onChange={e => setTipoRichiesta(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona...</option>
                  <option value="spostamento">Spostamento appuntamento</option>
                  <option value="inserimento">Nuova richiesta appuntamento</option>
                </select>
              </div>
            )}

            {tipo === 'nuovo_cliente' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cognome" />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <input type="text" placeholder="Cerca cliente..." list="clienti-list"
                  value={clienteNomeInput}
                  onChange={e => {
                    setClienteNomeInput(e.target.value)
                    const c = clienti.find(c => `${c.cognome} ${c.nome}` === e.target.value)
                    if (c) selezionaCliente(c.id)
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <datalist id="clienti-list">
                  {clienti.map(c => <option key={c.id} value={`${c.cognome} ${c.nome}`} />)}
                </datalist>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+39 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data richiesta</label>
                <input type="date" value={dataRichiesta} onChange={e => setDataRichiesta(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@esempio.it" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mese preferito</label>
              <div className="flex gap-2">
                <select value={mesePreferito.split('-')[1] || ''} onChange={e => setMesePreferito(`${mesePreferito.split('-')[0] || new Date().getFullYear()}-${e.target.value}`)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Mese</option>
                  {['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
                <select value={mesePreferito.split('-')[0] || ''} onChange={e => setMesePreferito(`${e.target.value}-${mesePreferito.split('-')[1] || '01'}`)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Anno</option>
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Data/ora appuntamento — precompilati se slot selezionato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data e ora appuntamento
                {slotSelezionato && <span className="ml-2 text-xs text-green-600 font-normal">← da app. liberato selezionato</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={dataAppuntamento} onChange={e => setDataAppuntamento(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${slotSelezionato ? 'border-green-400 bg-green-50' : 'border-gray-300'}`} />
                <input type="time" value={oraAppuntamento} onChange={e => setOraAppuntamento(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${slotSelezionato ? 'border-green-400 bg-green-50' : 'border-gray-300'}`} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia appuntamento</label>
              <select value={tipologiaId} onChange={e => setTipologiaId(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${slotSelezionato ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                <option value="">Seleziona tipologia...</option>
                {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              {tipologiaSelezionata && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tipologiaSelezionata.colore }} />
                  <span className="text-xs text-gray-500">{tipologiaSelezionata.nome} — {tipologiaSelezionata.durata_minuti} min</span>
                </div>
              )}
            </div>

            {dataAppuntamento && oraAppuntamento && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                ℹ️ Salvando verrà creato un appuntamento nel calendario e la richiesta diventerà <strong>gestita</strong>.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3} placeholder="Dettagli della richiesta..." />
            </div>

            {errore && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 flex items-start gap-2">
                <span>⚠️</span><span>{errore}</span>
              </div>
            )}
          </div>

          {/* ── Pannello app. liberati ── */}
          {mostraPannelloSlot && (
            <div className="w-64 shrink-0 border-l border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">📅 App. liberati disponibili</p>
                <p className="text-xs text-green-600 mt-0.5">Selezionane uno per precompilare data/ora</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {appLiberati.map(sl => {
                  const isSelected = slotSelezionato?.id === sl.id
                  const app = sl.appuntamento
                  return (
                    <button key={sl.id} onClick={() => selezionaSlot(sl)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all
                        ${isSelected
                          ? 'border-green-500 bg-green-50 ring-1 ring-green-400'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'}`}>
                      {app ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: app.tipologia_colore }} />
                            <span className="font-medium text-gray-700 truncate">{app.tipologia_nome}</span>
                          </div>
                          <div className="text-gray-600">
                            {new Date(app.data + 'T00:00:00').toLocaleDateString('it-IT')}
                          </div>
                          <div className="text-gray-500">{app.ora_inizio} – {app.ora_fine}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">{sl.note || 'App. liberato'}</span>
                      )}
                      {isSelected && (
                        <div className="mt-1.5 text-green-600 font-medium flex items-center gap-1">
                          ✓ Selezionato
                        </div>
                      )}
                    </button>
                  )
                })}
                {appLiberati.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Nessun app. liberato disponibile</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : dataAppuntamento && oraAppuntamento ? 'Salva e prenota' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
