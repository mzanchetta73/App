'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogCliente from '@/components/clienti/DialogCliente'

interface Cliente {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string
  note: string
}

export default function Clienti() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [ricerca, setRicerca] = useState('')
  const [vista, setVista] = useState<'griglia' | 'lista'>('griglia')
  const [ordinamento, setOrdinamento] = useState<'cognome' | 'nome'>('cognome')
  const [dialogAperto, setDialogAperto] = useState(false)
  const [clienteSelezionato, setClienteSelezionato] = useState<Cliente | undefined>()

  useEffect(() => {
    caricaClienti()
  }, [])

  async function caricaClienti() {
    const { data } = await supabase.from('clienti').select('*').order('cognome')
    if (data) setClienti(data)
    setLoading(false)
  }

  const clientiFiltrati = clienti
    .filter(c =>
      `${c.nome} ${c.cognome} ${c.email} ${c.telefono}`.toLowerCase().includes(ricerca.toLowerCase())
    )
    .sort((a, b) => {
      if (ordinamento === 'cognome') return a.cognome.localeCompare(b.cognome, 'it')
      return a.nome.localeCompare(b.nome, 'it')
    })

  function apriModifica(c: Cliente) {
    setClienteSelezionato(c)
    setDialogAperto(true)
  }

  function chiudiDialog() {
    setDialogAperto(false)
    setClienteSelezionato(undefined)
  }

  async function eliminaCliente(id: string) {
    if (!confirm('Elimina questo cliente?')) return
    await supabase.from('clienti').delete().eq('id', id)
    caricaClienti()
  }return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Clienti</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cerca clienti..."
              value={ricerca}
              onChange={e => setRicerca(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            <select
              value={ordinamento}
              onChange={e => setOrdinamento(e.target.value as 'cognome' | 'nome')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="cognome">Ordina per cognome</option>
              <option value="nome">Ordina per nome</option>
            </select>
            <button onClick={() => setVista('griglia')} className={`p-2 rounded-lg border ${vista === 'griglia' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>⊞</button>
            <button onClick={() => setVista('lista')} className={`p-2 rounded-lg border ${vista === 'lista' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}>☰</button>
            <button onClick={() => setDialogAperto(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Nuovo</button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : clientiFiltrati.length === 0 ? (
          <p className="text-gray-500">Nessun cliente trovato.</p>
        ) : vista === 'griglia' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientiFiltrati.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 mb-2 cursor-pointer flex-1" onClick={() => apriModifica(c)}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {c.nome?.[0] || ''}{c.cognome?.[0] || ''}
                    </div>
                    <h3 className="font-semibold text-gray-800">{c.nome} {c.cognome}</h3>
                  </div>
                  <button onClick={() => eliminaCliente(c.id)} className="text-red-400 hover:text-red-600 text-lg ml-2">🗑</button>
                </div>
                {c.telefono && <p className="text-sm text-gray-500">📞 {c.telefono}</p>}
                {c.email && <p className="text-sm text-gray-500">✉️ {c.email}</p>}
                {c.note && <p className="text-sm text-gray-400 mt-1 truncate">📝 {c.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {clientiFiltrati.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-blue-50 transition-colors ${i !== 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center j
ustify-center text-blue-600 font-semibold text-xs cursor-pointer" onClick={() => apriModifica(c)}>
                  {c.nome?.[0] || ''}{c.cognome?.[0] || ''}
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => apriModifica(c)}>
                  <span className="font-medium text-gray-800">{c.cognome} {c.nome}</span>
                </div>
                {c.telefono && <span className="text-sm text-gray-500">📞 {c.telefono}</span>}
                {c.email && <span className="text-sm text-gray-500">✉️ {c.email}</span>}
                <button onClick={() => eliminaCliente(c.id)} className="text-red-400 hover:text-red-600 text-lg ml-2">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogAperto && (
        <DialogCliente
          onClose={chiudiDialog}
          onSaved={() => { chiudiDialog(); caricaClienti() }}
          cliente={clienteSelezionato}
        />
      )}
    </AppLayout>
  )
}