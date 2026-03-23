'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DialogRichiesta from '@/components/lista-attesa/DialogRichiesta'
import DialogFissaAppuntamento from '@/components/lista-attesa/DialogFissaAppuntamento'

interface Richiesta {
  id: string; tipo: string; tipo_richiesta: string
  cliente_nome: string; telefono: string; email: string
  note: string; stato: string; data_richiesta: string
  mese_preferito: string; appuntamento_id?: string; tipologia_id?: string
  appuntamento?: { data: string; ora_inizio: string; ora_fine: string; tipologia_nome: string; tipologia_colore: string }
  tipologia?: { nome: string; colore: string }
}

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const ANNI = Array.from({ length: 5 }, (_, i) => 2024 + i)
type Tab = 'nuovo_cliente' | 'spostamento' | 'slot_liberato'

function getColore(r: Richiesta): string | null {
  if (r.appuntamento?.tipologia_colore) return r.appuntamento.tipologia_colore
  if (r.tipologia?.colore) return r.tipologia.colore
  return null
}

export default function ListaAttesa() {
  const [richieste, setRichieste] = useState<Richiesta[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('nuovo_cliente')
  const [subFiltro, setSubFiltro] = useState<'tutte'|'spostamento'|'inserimento'>('tutte')
  const [ricerca, setRicerca] = useState('')
  const [mostraGestite, setMostraGestite] = useState(false)
  const [filtroMese, setFiltroMese] = useState<number|''>('')
  const [filtroAnno, setFiltroAnno] = useState<number|''>('')
  const [dialogAperto, setDialogAperto] = useState(false)
  const [richiestaSelezionata, setRichiestaSelezionata] = useState<Richiesta|undefined>()
  const [dialogFissaAperto, setDialogFissaAperto] = useState(false)

  useEffect(() => { caricaRichieste() }, [])

  async function caricaRichieste() {
    const [{ data: richData, error }, { data: tipData }] = await Promise.all([
      supabase.from('lista_attesa')
        .select('*, appuntamento:appuntamento_id(data,ora_inizio,ora_fine,tipologia_nome,tipologia_colore)')
        .order('data_richiesta', { ascending: true }),
      supabase.from('tipologie').select('id,nome,colore')
    ])
    if (error) { console.error('Errore lista_attesa:', error); setLoading(false); return }
    if (richData) {
      const tipsMap = new Map((tipData || []).map((t: any) => [t.id, t]))
      setRichieste(richData.map((r: any) => ({
        ...r,
        tipologia: r.tipologia_id ? (tipsMap.get(r.tipologia_id) || null) : null
      })) as Richiesta[])
    }
    setLoading(false)
  }

  async function segnaGestito(r: Richiesta) {
    await supabase.from('lista_attesa').update({ stato: 'gestito' }).eq('id', r.id)
    if (r.appuntamento_id && r.tipo !== 'slot_liberato') {
      await supabase.from('appuntamenti').update({ stato: 'programmato' })
        .eq('id', r.appuntamento_id).eq('stato', 'in_attesa_spostamento')
    }
    caricaRichieste()
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questa richiesta?')) return
    await supabase.from('lista_attesa').delete().eq('id', id)
    caricaRichieste()
  }

  const nuoviClienti  = richieste.filter(r => r.tipo === 'nuovo_cliente')
  const spostamenti   = richieste.filter(r => r.tipo === 'spostamento' || r.tipo === 'inserimento')
  const appLiberi     = richieste.filter(r => r.tipo === 'slot_liberato')

  const filtra = (lista: Richiesta[]) => lista
    .filter(r => mostraGestite ? true : r.stato === 'in_attesa')
    .filter(r => !ricerca || r.cliente_nome?.toLowerCase().includes(ricerca.toLowerCase()))
    .filter(r => {
      if (tab !== 'spostamento' || subFiltro === 'tutte') return true
      if (subFiltro === 'spostamento') return r.tipo_richiesta === 'spostamento' || (r.tipo === 'spostamento' && r.tipo_richiesta !== 'inserimento')
      if (subFiltro === 'inserimento') return r.tipo_richiesta === 'inserimento'
      return true
    })
    .filter(r => {
      if (filtroMese === '' && filtroAnno === '') return true
      const d = new Date(r.data_richiesta)
      if (filtroMese !== '' && d.getMonth() !== filtroMese) return false
      if (filtroAnno !== '' && d.getFullYear() !== filtroAnno) return false
      return true
    })

  const listaCorrente = tab === 'nuovo_cliente' ? nuoviClienti : tab === 'spostamento' ? spostamenti : appLiberi
  const filtrate = filtra(listaCorrente)

  function pillolaLabel(r: Richiesta) {
    if (r.tipo === 'slot_liberato') return 'App. liberato'
    if (r.tipo === 'nuovo_cliente') return 'Nuovo cliente'
    if (r.tipo_richiesta === 'inserimento') return 'Inserimento'
    return 'Spostamento'
  }
  function pillolaClasse(r: Richiesta) {
    if (r.tipo === 'slot_liberato') return 'bg-green-100 text-green-700'
    if (r.tipo_richiesta === 'inserimento') return 'bg-purple-100 text-purple-700'
    if (r.tipo === 'spostamento') return 'bg-amber-100 text-amber-700'
    return 'bg-purple-100 text-purple-700'
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Lista d'attesa</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">🖨 Stampa</button>
            <button onClick={() => { setRichiestaSelezionata(undefined); setDialogAperto(true) }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
              + Nuova richiesta
            </button>
          </div>
        </div>

        {/* Tab principali */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { id: 'nuovo_cliente',  label: '👤 Nuovi clienti',             lista: nuoviClienti, cls: 'bg-blue-600' },
            { id: 'spostamento',    label: '🔄 Spostamenti / Richieste',    lista: spostamenti,  cls: 'bg-blue-600' },
            { id: 'slot_liberato',  label: '📅 Appuntamenti liberati',       lista: appLiberi,    cls: 'bg-green-600' },
          ] as const).map(({ id, label, lista, cls }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors
                ${tab === id ? `${cls} text-white` : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === id ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {lista.filter(r => r.stato === 'in_attesa').length}
              </span>
            </button>
          ))}
        </div>

        {/* Sub-filtro spostamenti */}
        {tab === 'spostamento' && (
          <div className="flex gap-2 mb-3">
            {(['tutte','spostamento','inserimento'] as const).map(v => (
              <button key={v} onClick={() => setSubFiltro(v)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors
                  ${subFiltro === v ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {v === 'tutte' ? 'Tutte' : v === 'spostamento' ? 'Spostamenti' : 'Inserimenti'}
              </button>
            ))}
          </div>
        )}

        {/* Filtri */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <input type="text" placeholder="Cerca per nome..." value={ricerca} onChange={e => setRicerca(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
          <select value={filtroMese} onChange={e => setFiltroMese(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti i mesi</option>
            {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={filtroAnno} onChange={e => setFiltroAnno(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tutti gli anni</option>
            {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {(filtroMese !== '' || filtroAnno !== '') && (
            <button onClick={() => { setFiltroMese(''); setFiltroAnno('') }} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={mostraGestite} onChange={e => setMostraGestite(e.target.checked)} className="rounded" />
            Mostra gestite
          </label>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-gray-500">Caricamento...</p>
        ) : filtrate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">{tab === 'slot_liberato' ? '📅' : '⏳'}</span>
            <p className="text-sm">
              {tab === 'slot_liberato' ? 'Nessun appuntamento liberato disponibile.' : 'Nessuna richiesta trovata.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrate.map((r, i) => {
              const isSlot = r.tipo === 'slot_liberato'
              const colore = getColore(r)
              return (
                <div key={r.id}
                  onClick={() => { if (r.stato === 'in_attesa' && !isSlot) { setRichiestaSelezionata(r); setDialogAperto(true) } }}
                  className={`bg-white border rounded-xl p-4 transition-all
                    ${r.stato === 'gestito' ? 'opacity-60' : ''}
                    ${r.stato === 'in_attesa' && !isSlot ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm' : ''}
                    ${isSlot && r.stato === 'in_attesa' ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl font-semibold text-gray-300 w-6 pt-0.5 shrink-0 tabular-nums">{i + 1}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${isSlot ? 'bg-green-100' : r.tipo === 'nuovo_cliente' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                      <span className="text-sm">{isSlot ? '📅' : r.tipo === 'nuovo_cliente' ? '👤' : '🔄'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-800">{r.cliente_nome}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pillolaClasse(r)}`}>{pillolaLabel(r)}</span>
                        {r.tipo !== 'slot_liberato' && <span className="text-xs text-gray-500">{new Date(r.data_richiesta).toLocaleDateString('it-IT')}</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 mb-1">
                        {r.telefono && <span>📞 {r.telefono}</span>}
                        {r.email && <span>✉️ {r.email}</span>}
                        {r.mese_preferito && !isSlot && <span>📅 Preferisce: {r.mese_preferito.split('-').reverse().join('/')}</span>}
                      </div>
                      {colore && (r.appuntamento || r.tipologia) && (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                          style={{ backgroundColor: `${colore}18`, borderLeft: `3px solid ${colore}` }}>
                          {isSlot ? (
                            <>
                              <span className="font-medium text-gray-700">App. disponibile:</span>
                              {r.appuntamento && <>
                                <span className="text-gray-600">{new Date(r.appuntamento.data+'T00:00:00').toLocaleDateString('it-IT')} ore {r.appuntamento.ora_inizio}–{r.appuntamento.ora_fine}</span>
                                <span className="font-medium" style={{ color: colore }}>{r.appuntamento.tipologia_nome}</span>
                              </>}
                            </>
                          ) : r.tipo === 'spostamento' && r.appuntamento ? (
                            <>
                              <span className="font-medium text-gray-700">Da spostare:</span>
                              <span className="text-gray-600">{new Date(r.appuntamento.data+'T00:00:00').toLocaleDateString('it-IT')} ore {r.appuntamento.ora_inizio}–{r.appuntamento.ora_fine}</span>
                              <span className="font-medium" style={{ color: colore }}>{r.appuntamento.tipologia_nome}</span>
                            </>
                          ) : r.tipologia ? (
                            <>
                              <span className="font-medium text-gray-700">Tipologia:</span>
                              <span className="font-medium" style={{ color: colore }}>{r.tipologia.nome}</span>
                            </>
                          ) : null}
                        </div>
                      )}
                      {r.note && !r.appuntamento && !isSlot && !r.tipologia && (
                        <p className="text-xs text-gray-400 mt-1">📝 {r.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                        ${r.stato === 'in_attesa'
                          ? isSlot ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'}`}>
                        {r.stato === 'in_attesa' ? (isSlot ? 'Disponibile' : 'In attesa') : 'Gestito'}
                      </span>
                      {r.stato === 'in_attesa' && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setRichiestaSelezionata(r); setDialogFissaAperto(true) }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                            title={isSlot ? 'Assegna slot' : 'Fissa appuntamento'}>📅</button>
                          <button onClick={e => { e.stopPropagation(); segnaGestito(r) }}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors"
                            title="Segna gestito">✓</button>
                        </>
                      )}
                      <button onClick={e => { e.stopPropagation(); elimina(r.id) }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">🗑</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dialogFissaAperto && richiestaSelezionata && (
        <DialogFissaAppuntamento
          richiesta={richiestaSelezionata}
          onClose={() => { setDialogFissaAperto(false); setRichiestaSelezionata(undefined) }}
          onSaved={() => { setDialogFissaAperto(false); setRichiestaSelezionata(undefined); caricaRichieste() }}
        />
      )}
      {dialogAperto && (
        <DialogRichiesta
          onClose={() => { setDialogAperto(false); setRichiestaSelezionata(undefined) }}
          onSaved={() => { setDialogAperto(false); setRichiestaSelezionata(undefined); caricaRichieste() }}
          richiesta={richiestaSelezionata}
        />
      )}
    </AppLayout>
  )
}
