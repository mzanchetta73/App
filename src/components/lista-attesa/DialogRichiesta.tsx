'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente { id: string; nome: string; cognome: string; telefono: string; email: string }
interface Tipologia { id: string; nome: string }
interface Props { 
  onClose: () => void
  onSaved: () => void
  richiesta?: {
    id: string
    tipo: string
    tipo_richiesta: string
    tipologia_id: string
    cliente_nome: string
    telefono: string
    email: string
    note: string
    data_richiesta: string
    mese_preferito: string
  }
}

export default function DialogRichiesta({ onClose, onSaved, richiesta }: Props) {
 const [tipo, setTipo] = useState<'nuovo_cliente' | 'spostamento'>((richiesta?.tipo as any) || 'nuovo_cliente')
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNomeInput, setClienteNomeInput] = useState(richiesta?.tipo === 'spostamento' ? richiesta.cliente_nome : '')
  const [tipoRichiesta, setTipoRichiesta] = useState(richiesta?.tipo_richiesta || '')
  const [nome, setNome] = useState(richiesta?.tipo === 'nuovo_cliente' ? richiesta.cliente_nome.split(' ')[0] : '')
  const [cognome, setCognome] = useState(richiesta?.tipo === 'nuovo_cliente' ? richiesta.cliente_nome.split(' ').slice(1).join(' ') : '')
  const [telefono, setTelefono] = useState(richiesta?.telefono || '')
  const [email, setEmail] = useState(richiesta?.email || '')
  const [dataRichiesta, setDataRichiesta] = useState(richiesta?.data_richiesta || new Date().toISOString().split('T')[0])
  const [mesePreferito, setMesePreferito] = useState(richiesta?.mese_preferito || '')
const [dataAppuntamento, setDataAppuntamento] = useState('')
const [oraAppuntamento, setOraAppuntamento] = useState('')
const [tipologiaId, setTipologiaId] = useState(richiesta?.tipologia_id || '')
const [note, setNote] = useState(richiesta?.note || '')
const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('clienti').select('id, nome, cognome, telefono, email').order('cognome').then(({ data }) => { if (data) setClienti(data) })
    supabase.from('tipologie').select('id, nome').order('nome').then(({ data }) => { if (data) setTipologie(data) })
  }, [])

  function selezionaCliente(id: string) {
    setClienteId(id)
    const c = clienti.find(c => c.id === id)
    if (c) { setTelefono(c.telefono || ''); setEmail(c.email || '') }
  }

async function salva() {
    setSaving(true)
    let nomeCliente = ''
    if (tipo === 'nuovo_cliente') {
      if (!nome.trim() && !cognome.trim()) { setSaving(false); return }
      nomeCliente = `${nome} ${cognome}`.trim()
      if (!richiesta) await supabase.from('clienti').insert({ nome, cognome, telefono, email })
    } else {
      if (clienteId) {
        const c = clienti.find(c => c.id === clienteId)
        if (c) nomeCliente = `${c.nome} ${c.cognome}`
      } else {
        nomeCliente = clienteNomeInput
      }
      if (!nomeCliente) { setSaving(false); return }
    }

    const dati = {
      tipo,
      tipo_richiesta: tipo === 'spostamento' ? tipoRichiesta : null,
      tipologia_id: tipologiaId || null,
      cliente_nome: nomeCliente,
      telefono, email, note,
      mese_preferito: mesePreferito,
      stato: 'in_attesa',
      data_richiesta: dataRichiesta
    }

    if (richiesta) {
      await supabase.from('lista_attesa').update(dati).eq('id', richiesta.id)
    } else {
      await supabase.from('lista_attesa').insert(dati)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Nuova richiesta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Tab tipo */}
          <div className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center gap-2 ${tipo === 'nuovo_cliente' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
            {tipo === 'nuovo_cliente' ? '👤 Nuovo cliente' : '🔄 Spostamento/Richiesta'}
          </div>

          {/* Tipo dropdown */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data richiesta *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Mese preferito dal cliente</label>
            <div className="flex gap-2">
  <select
    value={mesePreferito.split('-')[1] || ''}
    onChange={e => setMesePreferito(`${mesePreferito.split('-')[0] || new Date().getFullYear()}-${e.target.value}`)}
    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Mese</option>
    <option value="01">Gennaio</option>
    <option value="02">Febbraio</option>
    <option value="03">Marzo</option>
    <option value="04">Aprile</option>
    <option value="05">Maggio</option>
    <option value="06">Giugno</option>
    <option value="07">Luglio</option>
    <option value="08">Agosto</option>
    <option value="09">Settembre</option>
    <option value="10">Ottobre</option>
    <option value="11">Novembre</option>
    <option value="12">Dicembre</option>
  </select>
  <select
    value={mesePreferito.split('-')[0] || ''}
    onChange={e => setMesePreferito(`${e.target.value}-${mesePreferito.split('-')[1] || '01'}`)}
    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Anno</option>
    {[2025, 2026, 2027, 2028, 2029, 2030].map(a => (
      <option key={a} value={a}>{a}</option>
    ))}
</select>
</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data appuntamento</label>
              <input type="date" value={dataAppuntamento} onChange={e => setDataAppuntamento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ora appuntamento</label>
              <input type="time" value={oraAppuntamento} onChange={e => setOraAppuntamento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia appuntamento</label>
            <select value={tipologiaId} onChange={e => setTipologiaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleziona tipologia...</option>
              {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3} placeholder="Dettagli della richiesta..." />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
          <button onClick={salva} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}