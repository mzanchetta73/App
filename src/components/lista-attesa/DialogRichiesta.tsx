'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente {
  id: string
  nome: string
  cognome: string
  telefono: string
  email: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function DialogRichiesta({ onClose, onSaved }: Props) {
  const [tipo, setTipo] = useState<'nuovo_cliente' | 'spostamento'>('nuovo_cliente')
  const [tipoRichiesta, setTipoRichiesta] = useState<'inserimento' | 'spostamento'>('inserimento')
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [mesePreferito, setMesePreferito] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('clienti').select('id, nome, cognome, telefono, email').order('cognome').then(({ data }) => {
      if (data) setClienti(data)
    })
  }, [])

  function selezionaCliente(id: string) {
    setClienteId(id)
    const c = clienti.find(c => c.id === id)
    if (c) {
      setClienteNome(`${c.nome} ${c.cognome}`)
      setTelefono(c.telefono || '')
      setEmail(c.email || '')
    }
  }

  async function salva() {
    setSaving(true)
    if (tipo === 'nuovo_cliente') {
      if (!nome.trim() && !cognome.trim()) { setSaving(false); return }
      const nomeCompleto = `${nome} ${cognome}`.trim()
      await supabase.from('clienti').insert({ nome, cognome, telefono, email })
      await supabase.from('lista_attesa').insert({
        tipo: 'nuovo_cliente',
        cliente_nome: nomeCompleto,
        telefono,
        email,
        note,
        mese_preferito: mesePreferito,
        stato: 'in_attesa',
        data_richiesta: new Date().toISOString().split('T')[0]
      })
    } else {
      if (!clienteId) { setSaving(false); return }
      await supabase.from('lista_attesa').insert({
        tipo: tipoRichiesta === 'spostamento' ? 'spostamento' : 'spostamento',
        cliente_nome: clienteNome,
        telefono,
        email,
        note,
        mese_preferito: mesePreferito,
        stato: 'in_attesa',
        data_richiesta: new Date().toISOString().split('T')[0]
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nuova richiesta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTipo('nuovo_cliente')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${tipo === 'nuovo_cliente' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600'}`}
          >👤 Nuovo cliente</button>
          <button
            onClick={() => setTipo('spostamento')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${tipo === 'spostamento' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600'}`}
          >🔄 Spostamento / Richiesta</button>
        </div>

        <div className="space-y-3">
          {tipo === 'nuovo_cliente' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cognome" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+39 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@esempio.it" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={clienteId} onChange={e => selezionaCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona cliente...</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo richiesta</label>
                <select value={tipoRichiesta} onChange={e => setTipoRichiesta(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="inserimento">Inserimento nuovo appuntamento</option>
                  <option value="spostamento">Spostamento appuntamento esistente</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mese preferito</label>
            <input type="month" value={mesePreferito} onChange={e => setMesePreferito(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3} placeholder="Dettagli della richiesta..." />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Annulla
          </button>
          <button onClick={salva} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}