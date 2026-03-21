'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [tab, setTab] = useState<'in_attesa' | 'gestito'>('in_attesa')
  const [ricerca, setRicerca] = useState('')

  useEffect(() => { caricaRichieste() }, [])

  async function caricaRichieste() {
    const { data } = await supabase.from('lista_attesa').select('*').order('data_richiesta', { ascending: false })
    if (data) setRichieste(data)
    setLoading(false)
  }

  async function segnaGestito(id: string) {
    await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', id)
    caricaRichieste()
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare?')) return
    await supabase.from('lista_attesa').delete().eq('id', id)
    caricaRichieste()
  }

  const filtrate = richieste
    .filter(r => r.stato === tab)
    .filter(r => r.cliente_nome?.toLowerCase().includes(ricerca.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Lista d'attesa</h1>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            + Nuova richiesta
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('in_attesa')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'in_attesa' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            In attesa ({richieste.filter(r => r.stato === 'in_attesa').length})
          </button>
          <button onClick={() => setTab('gestito')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'gestito' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            Gestite
          </button>
        </div>
        <input
          type="text"
          placeholder="Cerca per nome..."
          value={ricerca}
          onChange={e => setRicerca(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : filtrate.length === 0 ? (
          <p className="text-gray-500">Nessuna richiesta trovata.</p>
        ) : (
          <div className="space-y-3">
            {filtrate.map((r, i) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-6">{i + 1}</span>
                    <div className={`p-2 rounded-full text-sm ${r.tipo === 'nuovo_cliente' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                      {r.tipo === 'nuovo_cliente' ? '👤' : '🔄'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{r.cliente_nome}</h3>
                      <p className="text-xs text-gray-500">{new Date(r.data_richiesta).toLocaleDateString('it-IT')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.stato === 'in_attesa' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {r.stato === 'in_attesa' ? 'In attesa' : 'Gestito'}
                    </span>
                    {r.stato === 'in_attesa' && (
                      <button onClick={() => segnaGestito(r.id)} className="text-green-500 hover:text-green-700">✓</button>
                    )}
                    <button onClick={() => elimina(r.id)} className="text-red-400 hover:text-red-600">🗑</button>
                  </div>
                </div>
                <div className="mt-2 ml-12 flex flex-wrap gap-3 text-sm text-gray-500">
                  {r.telefono && <span>📞 {r.telefono}</span>}
                  {r.email && <span>✉️ {r.email}</span>}
                  {r.mese_preferito && <span>📅 {r.mese_preferito}</span>}
                  {r.note && <p className="w-full text-gray-400 text-xs mt-1">📝 {r.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}