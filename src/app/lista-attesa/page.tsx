'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogRichiesta from '@/components/lista-attesa/DialogRichiesta'

interface Richiesta {
  id: string
  tipo: string
  cliente_nome: string
  telefono: string
  email: string
  note: string
  stato: string
  data_richiesta: string
  mese_preferito: string
}

export default function ListaAttesa() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'nuovo_cliente' | 'spostamento'>('nuovo_cliente')
  const [ricerca, setRicerca] = useState('')
  const [dialogAperto, setDialogAperto] = useState(false)
  const [mostraGestite, setMostraGestite] = useState(false)

  useEffect(() => { caricaRichieste() }, [])

  async function caricaRichieste() {
    const { data } = await supabase.from('lista_attesa').select('*').order('data_richiesta', { ascending: true })
    if (data) setRichieste(data)
    setLoading(false)
  }

  async function segnaGestito(id: string) {
    await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', id)
    caricaRichieste()
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa richiesta?')) return
    await supabase.from('lista_attesa').delete().eq('id', id)
    caricaRichieste()
  }

  const nuoviClienti = richieste.filter(r => r.tipo === 'nuovo_cliente')
  const spostamenti = richieste.filter(r => r.tipo === 'spostamento')

  const filtrate = (tab === 'nuovo_cliente' ? nuoviClienti : spostamenti)
    .filter(r => mostraGestite ? true : r.stato === 'in_attesa')
    .filter(r => r.cliente_nome?.toLowerCase().includes(ricerca.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Lista d'attesa</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1">
              🖨 Stampa
            </button>
            <button
              onClick={() => setDialogAperto(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              + Nuova richiesta
            </button>
          </div>
        </div>

        {/* Tab principali */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('nuovo_cliente')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'nuovo_cliente' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            👤 Nuovi clienti
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === 'nuovo_cliente' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {nuoviClienti.filter(r => r.stato === 'in_attesa').length}
            </span>
          </button>
          <button
            onClick={() => setTab('spostamento')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'spostamento' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            🔄 Spostamenti / Richieste
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === 'spostamento' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {spostamenti.filter(r => r.stato === 'in_attesa').length}
            </span>
          </button>
        </div>

        {/* Filtri */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Cerca per nome..."
            value={ricerca}
            onChange={e => setRicerca(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={mostraGestite} onChange={e => setMostraGestite(e.target.checked)}
              className="rounded" />
            Mostra gestite
          </label>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : filtrate.length === 0 ? (
          <p className="text-gray-500">Nessuna richiesta trovata.</p>
        ) : (
          <div className="space-y-3">
            {filtrate.map((r, i) => (
              <div key={r.id} className={`bg-white border border-gray-200 rounded-lg p-4 ${r.stato === 'gestito' ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 font-medium text-sm w-5 pt-0.5">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.tipo === 'nuovo_cliente' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    <span className="text-sm">{r.tipo === 'nuovo_cliente' ? '👤' : '🔄'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{r.cliente_nome}</h3>
                      <span className="text-xs text-gray-500">Richiesta: {new Date(r.data_richiesta).toLocaleDateString('it-IT')}</span>
                      {r.tipo === 'spostamento' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Spostamento appuntamento</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Nuovo cliente</span>
                      )}
                      {r.mese_preferito && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">📅 {r.mese_preferito}</span>
                      )}
                      {r.telefono && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">📞 {r.telefono}</span>
                      )}
                    </div>
                    {r.email && <p className="text-xs text-gray-500 mt-0.5">✉️ {r.email}</p>}
                    {r.note && <p className="text-xs text-gray-400 mt-1">📝 {r.note}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.stato === 'in_attesa' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {r.stato === 'in_attesa' ? 'In attesa' : 'Gestito'}
                    </span>
                    {r.stato === 'in_attesa' && (
                      <button onClick={() => segnaGestito(r.id)} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-full" title="Segna come gestito">
                        ✓
                      </button>
                    )}
                    <button onClick={() => elimina(r.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogAperto && (
        <DialogRichiesta
          onClose={() => setDialogAperto(false)}
          onSaved={() => { setDialogAperto(false); caricaRichieste() }}
        />
      )}
    </AppLayout>
  )
}