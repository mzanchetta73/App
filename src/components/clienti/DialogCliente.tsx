'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
  cliente?: {
    id: string
    nome: string
    cognome: string
    email: string
    telefono: string
    note: string
  }
}

export default function DialogCliente({ onClose, onSaved, cliente }: Props) {
  const [nome, setNome] = useState(cliente?.nome || '')
  const [cognome, setCognome] = useState(cliente?.cognome || '')
  const [email, setEmail] = useState(cliente?.email || '')
  const [telefono, setTelefono] = useState(cliente?.telefono || '')
  const [note, setNote] = useState(cliente?.note || '')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return
    setSaving(true)
    if (cliente) {
      await supabase.from('clienti').update({ nome, cognome, email, telefono, note }).eq('id', cliente.id)
    } else {
      await supabase.from('clienti').insert({ nome, cognome, email, telefono, note })
    }
    setSaving(false)
    onSaved()
  }

  async function elimina() {
    if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return
    await supabase.from('clienti').delete().eq('id', cliente!.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{cliente ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
              <input
                type="text"
                value={cognome}
                onChange={e => setCognome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cognome"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@esempio.it"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+39 ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Note sul cliente..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {cliente && (
            <button onClick={elimina} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
              Elimina
            </button>
          )}
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