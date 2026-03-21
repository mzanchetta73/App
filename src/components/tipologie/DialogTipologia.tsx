'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const COLORI = [
  // Blu
  '#BFDBFE', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8',
  // Verde
  '#BBF7D0', '#4ADE80', '#22C55E', '#16A34A', '#15803D',
  // Rosso
  '#FECACA', '#F87171', '#EF4444', '#DC2626', '#B91C1C',
  // Giallo/Arancio
  '#FEF08A', '#FCD34D', '#F59E0B', '#D97706', '#F97316',
  // Viola
  '#DDD6FE', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9',
  // Rosa
  '#FBCFE8', '#F472B6', '#EC4899', '#DB2777', '#BE185D',
  // Teal
  '#99F6E4', '#2DD4BF', '#14B8A6', '#0D9488', '#0F766E',
  // Grigio
  '#F1F5F9', '#CBD5E1', '#94A3B8', '#64748B', '#475569',
]

interface Props {
  onClose: () => void
  onSaved: () => void
  tipologia?: {
    id: string
    nome: string
    durata_minuti: number
    colore: string
    descrizione: string
  }
}

export default function DialogTipologia({ onClose, onSaved, tipologia }: Props) {
  const [nome, setNome] = useState(tipologia?.nome || '')
  const [durata, setDurata] = useState(tipologia?.durata_minuti?.toString() || '60')
  const [colore, setColore] = useState(tipologia?.colore || '#3B82F6')
  const [descrizione, setDescrizione] = useState(tipologia?.descrizione || '')
  const [saving, setSaving] = useState(false)

  async function salva() {
    if (!nome.trim()) return
    setSaving(true)
    if (tipologia) {
      await supabase.from('tipologie').update({ nome, durata_minuti: parseInt(durata), colore, descrizione }).eq('id', tipologia.id)
    } else {
      await supabase.from('tipologie').insert({ nome, durata_minuti: parseInt(durata), colore, descrizione })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{tipologia ? 'Modifica Tipologia' : 'Nuova Tipologia'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es. Consulenza"
            />
          </div>

      <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Durata</label>
  <div className="flex items-center gap-2">
    <input
      type="number"
      min="0"
      max="23"
      value={Math.floor(parseInt(durata) / 60)}
      onChange={e => setDurata(String(parseInt(e.target.value || '0') * 60 + (parseInt(durata) % 60)))}
      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-500">ore</span>
    <input
      type="number"
      min="0"
      max="59"
      value={parseInt(durata) % 60}
      onChange={e => setDurata(String(Math.floor(parseInt(durata) / 60) * 60 + parseInt(e.target.value || '0')))}
      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-500">minuti</span>
  </div>
</div>

        <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
  <div className="flex items-center gap-3">
    <input
      type="color"
      value={colore}
      onChange={e => setColore(e.target.value)}
      className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
    />
    <span className="text-sm text-gray-500">Clicca per scegliere il colore</span>
    <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: colore }}></div>
  </div>
</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descrizione opzionale..."
            />
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