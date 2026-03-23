'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogTipologia from '@/components/tipologie/DialogTipologia'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string; descrizione: string }

function formatDurata(min: number) {
  const h = Math.floor(min / 60), m = min % 60
  if (h > 0 && m > 0) return `${h}h ${m} min`
  if (h > 0) return `${h} or${h === 1 ? 'a' : 'e'}`
  return `${min} minuti`
}

const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

export default function Tipologie() {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAperto, setDialogAperto] = useState(false)
  const [tipologiaSelezionata, setTipologiaSelezionata] = useState<Tipologia | undefined>()

  useEffect(() => { caricaTipologie() }, [])

  async function caricaTipologie() {
    const { data } = await supabase.from('tipologie').select('*').order('nome')
    if (data) setTipologie(data)
    setLoading(false)
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa tipologia?')) return
    await supabase.from('tipologie').delete().eq('id', id)
    caricaTipologie()
  }

  function apriModifica(t: Tipologia) { setTipologiaSelezionata(t); setDialogAperto(true) }
  function chiudiDialog() { setDialogAperto(false); setTipologiaSelezionata(undefined) }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Tipologie Appuntamento</h1>
          <button onClick={() => setDialogAperto(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
            + Nuova
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Caricamento...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipologie.map(t => (
              <div key={t.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all"
                style={{ borderLeft: `4px solid ${t.colore}` }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.colore }} />
                  <h3 className="font-semibold text-gray-800">{t.nome}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                  <IconClock /><span>{formatDurata(t.durata_minuti)}</span>
                </div>
                {t.descrizione
                  ? <p className="text-sm text-gray-400 mb-3 line-clamp-2">{t.descrizione}</p>
                  : <p className="text-sm text-gray-300 italic mb-3">— nessuna descrizione —</p>
                }
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => apriModifica(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                    <IconEdit /> Modifica
                  </button>
                  <button onClick={() => elimina(t.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setDialogAperto(true)}
              className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all min-h-[140px]">
              <span className="text-2xl font-light leading-none">+</span>
              <span className="text-sm font-medium">Nuova tipologia</span>
            </button>
          </div>
        )}
      </div>
      {dialogAperto && (
        <DialogTipologia onClose={chiudiDialog} onSaved={() => { chiudiDialog(); caricaTipologie() }} tipologia={tipologiaSelezionata} />
      )}
    </AppLayout>
  )
}
