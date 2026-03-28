'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogTipologia from '@/components/tipologie/DialogTipologia'
import DialogTipologiaBlocco from '@/components/tipologie/DialogTipologiaBlocco'

interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string; descrizione: string }
interface TipologiaBlocco { id: string; nome: string; ora_inizio: string | null; ora_fine: string | null; colore: string; note: string | null }

function formatDurata(min: number) {
  const h = Math.floor(min / 60), m = min % 60
  if (h > 0 && m > 0) return `${h}h ${m} min`
  if (h > 0) return `${h} or${h === 1 ? 'a' : 'e'}`
  return `${min} minuti`
}

function formatOrario(ora: string | null) {
  return ora ? ora.substring(0, 5) : null
}

const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

export default function Tipologie() {
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [tipologieBlocco, setTipologieBlocco] = useState<TipologiaBlocco[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogApp, setDialogApp] = useState(false)
  const [tipologiaSelezionata, setTipologiaSelezionata] = useState<Tipologia | undefined>()

  const [dialogBlocco, setDialogBlocco] = useState(false)
  const [tipologiaBloccoSelezionata, setTipologiaBloccoSelezionata] = useState<TipologiaBlocco | undefined>()

  useEffect(() => { carica() }, [])

  async function carica() {
    const [{ data: appData }, { data: bloccoData }] = await Promise.all([
      supabase.from('tipologie').select('*').order('nome'),
      supabase.from('tipologie_blocco').select('*').order('nome'),
    ])
    if (appData) setTipologie(appData)
    if (bloccoData) setTipologieBlocco(bloccoData as TipologiaBlocco[])
    setLoading(false)
  }

  async function eliminaApp(id: string) {
    if (!confirm('Eliminare questa tipologia?')) return
    await supabase.from('tipologie').delete().eq('id', id)
    carica()
  }
  async function eliminaBlocco(id: string) {
    if (!confirm('Eliminare questo tipo di blocco?')) return
    await supabase.from('tipologie_blocco').delete().eq('id', id)
    carica()
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-10">

        {/* ── Sezione Tipologie Appuntamento ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Tipologie Appuntamento</h1>
              <p className="text-sm text-gray-400 mt-0.5">Tipi di appuntamento con durata e colore</p>
            </div>
            <button onClick={() => { setTipologiaSelezionata(undefined); setDialogApp(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
              + Nuova
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Caricamento...</p>
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
                    <button onClick={() => { setTipologiaSelezionata(t); setDialogApp(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                      <IconEdit /> Modifica
                    </button>
                    <button onClick={() => eliminaApp(t.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100">
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setTipologiaSelezionata(undefined); setDialogApp(true) }}
                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all min-h-[140px]">
                <span className="text-2xl font-light">+</span>
                <span className="text-sm font-medium">Nuova tipologia</span>
              </button>
            </div>
          )}
        </div>

        {/* Separatore */}
        <div className="border-t border-gray-200" />

        {/* ── Sezione Tipi Blocca Giornata ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Tipi Blocca Giornata</h1>
              <p className="text-sm text-gray-400 mt-0.5">Tipi di blocco calendario con orario e colore</p>
            </div>
            <button onClick={() => { setTipologiaBloccoSelezionata(undefined); setDialogBlocco(true) }}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium">
              + Nuovo
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Caricamento...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tipologieBlocco.map(t => {
                const oraI = formatOrario(t.ora_inizio)
                const oraF = formatOrario(t.ora_fine)
                return (
                  <div key={t.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all"
                    style={{ borderLeft: `4px solid ${t.colore}` }}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.colore }} />
                      <h3 className="font-semibold text-gray-800">{t.nome}</h3>
                    </div>
                    {oraI && oraF ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                        <IconClock /><span>{oraI} – {oraF}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mb-1">Giornata intera</p>
                    )}
                    {t.note
                      ? <p className="text-sm text-gray-400 mb-3 line-clamp-2">{t.note}</p>
                      : <p className="text-sm text-gray-300 italic mb-3">— nessuna nota —</p>
                    }
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => { setTipologiaBloccoSelezionata(t); setDialogBlocco(true) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                        <IconEdit /> Modifica
                      </button>
                      <button onClick={() => eliminaBlocco(t.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => { setTipologiaBloccoSelezionata(undefined); setDialogBlocco(true) }}
                className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/30 transition-all min-h-[140px]">
                <span className="text-2xl font-light">+</span>
                <span className="text-sm font-medium">Nuovo tipo blocco</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {dialogApp && (
        <DialogTipologia
          tipologia={tipologiaSelezionata}
          onClose={() => { setDialogApp(false); setTipologiaSelezionata(undefined) }}
          onSaved={() => { setDialogApp(false); setTipologiaSelezionata(undefined); carica() }}
        />
      )}
      {dialogBlocco && (
        <DialogTipologiaBlocco
          tipologia={tipologiaBloccoSelezionata}
          onClose={() => { setDialogBlocco(false); setTipologiaBloccoSelezionata(undefined) }}
          onSaved={() => { setDialogBlocco(false); setTipologiaBloccoSelezionata(undefined); carica() }}
        />
      )}
    </AppLayout>
  )
}
