'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogTipologia from '@/components/tipologie/DialogTipologia'

interface Tipologia {
  id: string
  nome: string
  durata_minuti: number
  colore: string
  descrizione: string
}

export default function Tipologie() {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAperto, setDialogAperto] = useState(false)
  const [tipologiaSelezionata, setTipologiaSelezionata] = useState<Tipologia | undefined>()

  useEffect(() => {
    caricaTipologie()
  }, [])

  async function caricaTipologie() {
    const { data } = await supabase.from('tipologie').select('*').order('nome')
    if (data) setTipologie(data)
    setLoading(false)
  }

  async function elimina(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questa tipologia?')) return
    await supabase.from('tipologie').delete().eq('id', id)
    caricaTipologie()
  }

  function apriModifica(t: Tipologia) {
    setTipologiaSelezionata(t)
    setDialogAperto(true)
  }

  function chiudiDialog() {
    setDialogAperto(false)
    setTipologiaSelezionata(undefined)
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Tipologie Appuntamento</h1>
          <button
            onClick={() => setDialogAperto(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Nuova
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : tipologie.length === 0 ? (
          <p className="text-gray-500">Nessuna tipologia ancora. Creane una!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipologie.map((t) => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.colore }}></div>
                  <h3 className="font-semibold text-gray-800">{t.nome}</h3>
                </div>
                <p className="text-sm text-gray-500">⏱ {Math.floor(t.durata_minuti / 60) > 0 ? `${Math.floor(t.durata_minuti / 60)}h ` : ''}{t.durata_minuti % 60 > 0 ? `${t.durata_minuti % 60}min` : ''}</p>
                {t.descrizione && <p className="text-sm text-gray-400 mt-1">{t.descrizione}</p>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => apriModifica(t)}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    onClick={() => elimina(t.id)}
                    className="px-3 py-1 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dialogAperto && (
        <DialogTipologia
          onClose={chiudiDialog}
          onSaved={() => { chiudiDialog(); caricaTipologie() }}
          tipologia={tipologiaSelezionata}
        />
      )}
    </AppLayout>
  )
}