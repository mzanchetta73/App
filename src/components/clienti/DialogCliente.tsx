'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DialogAppuntamento from '@/components/calendario/DialogAppuntamento'

interface Props {
  onClose: () => void
  onSaved: () => void
  cliente?: { id: string; nome: string; cognome: string; email: string; telefono: string; note: string }
  // FIX: callback opzionale per aprire dialog appuntamento dopo aver creato un nuovo cliente
  dopoSalvataggio?: 'apri_appuntamento' | null
}
interface Appuntamento {
  id: string; data: string; ora_inizio: string; ora_fine: string
  tipologia_id: string; tipologia_nome: string; tipologia_colore: string
  stato: string; note: string
}
interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }

const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const MESI_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const ANNI = Array.from({ length: 6 }, (_, i) => 2024 + i)
const annoCorrente = new Date().getFullYear()

const GIORNI_IT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
function formatDataConGiorno(dataStr: string) {
  const d = new Date(dataStr + 'T00:00:00')
  return `${GIORNI_IT[d.getDay()]} ${d.toLocaleDateString('it-IT')}`
}

const IconCal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconClk = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

// ─── Sub-dialog azioni appuntamento ──────────────────────────────────────────
function DialogAzione({ appt, clienteNome, clienteTel, clienteEmail, tipologie, onClose, onSaved }: {
  appt: Appuntamento; clienteNome: string; clienteTel: string; clienteEmail: string
  tipologie: Tipologia[]; onClose: () => void; onSaved: () => void
}) {
  const [modo, setModo] = useState<'menu' | 'data' | 'sposta' | 'annulla'>('menu')
  const [nuovaData, setNuovaData] = useState(appt.data)
  const [nuovaOra, setNuovaOra] = useState(appt.ora_inizio)
  const [nuovaTipId, setNuovaTipId] = useState('')
  const [saving, setSaving] = useState(false)

  function fine(inizio: string, dur: number) {
    const [h, m] = inizio.split(':').map(Number)
    const t = h * 60 + m + dur
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }

  async function salvaCambioData() {
    setSaving(true)
    const t = tipologie.find(t => t.id === nuovaTipId)
    await supabase.from('appuntamenti').update({
      data: nuovaData, ora_inizio: nuovaOra,
      ora_fine: t ? fine(nuovaOra, t.durata_minuti) : appt.ora_fine,
      stato: 'programmato',
      ...(t ? { tipologia_id: t.id, tipologia_nome: t.nome, tipologia_colore: t.colore } : {})
    }).eq('id', appt.id)
    setSaving(false); onSaved()
  }

  async function spostaInLista() {
    setSaving(true)
    await supabase.from('appuntamenti').update({ stato: 'in_attesa_spostamento' }).eq('id', appt.id)
    const { data: es } = await supabase.from('lista_attesa').select('id').eq('appuntamento_id', appt.id).maybeSingle()
    if (!es) {
      await supabase.from('lista_attesa').insert({
        tipo: 'spostamento', tipo_richiesta: 'spostamento',
        appuntamento_id: appt.id, cliente_nome: clienteNome,
        telefono: clienteTel, email: clienteEmail,
        stato: 'in_attesa', data_richiesta: new Date().toISOString().split('T')[0],
      })
    }
    setSaving(false); onSaved()
  }

  async function annulla() {
    setSaving(true)
    await supabase.from('appuntamenti').update({ stato: 'cancellato' }).eq('id', appt.id)

    // FIX: controlla che non esista già uno slot liberato per evitare duplicati
    const { data: esiste } = await supabase
      .from('lista_attesa')
      .select('id')
      .eq('appuntamento_id', appt.id)
      .eq('tipo', 'slot_liberato')
      .maybeSingle()

    if (!esiste) {
      await supabase.from('lista_attesa').insert({
        tipo: 'slot_liberato', tipo_richiesta: 'slot_liberato',
        appuntamento_id: appt.id, cliente_nome: clienteNome,
        telefono: clienteTel, email: clienteEmail,
        stato: 'in_attesa', data_richiesta: new Date().toISOString().split('T')[0],
        mese_preferito: appt.data.substring(0, 7),
      })
    }

    setSaving(false); onSaved()
  }

  async function eliminaDef() {
    if (!confirm('Eliminare definitivamente?')) return
    setSaving(true)
    await supabase.from('appuntamenti').delete().eq('id', appt.id)
    setSaving(false); onSaved()
  }

  const tipSel = tipologie.find(t => t.id === nuovaTipId)
  const isInAttesa = appt.stato === 'in_attesa_spostamento'
  const colore = isInAttesa ? '#D1D5DB' : (appt.tipologia_colore || '#3B82F6')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Appuntamento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="px-3 py-2.5 rounded-lg mb-4 text-sm"
          style={{ borderLeft: `4px solid ${colore}`, backgroundColor: `${colore}12` }}>
          <p className={`font-semibold mb-0.5 ${isInAttesa ? 'text-gray-400' : 'text-gray-800'}`}>{appt.tipologia_nome}</p>
          <div className={`flex items-center gap-3 text-xs ${isInAttesa ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="flex items-center gap-1"><IconCal />{new Date(appt.data + 'T00:00:00').toLocaleDateString('it-IT')}</span>
            <span className="flex items-center gap-1"><IconClk />{appt.ora_inizio}–{appt.ora_fine}</span>
          </div>
          {isInAttesa && <p className="text-xs text-amber-600 mt-1 font-medium">⟳ In attesa di spostamento</p>}
        </div>
        {modo === 'menu' && (
          <div className="space-y-2">
            <button onClick={() => setModo('data')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-sm transition-colors flex items-center gap-2">📅 Cambia data / ora</button>
            {!isInAttesa && (
              <button onClick={() => setModo('sposta')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-sm transition-colors flex items-center gap-2">🔄 Sposta in lista d'attesa</button>
            )}
            <button onClick={() => setModo('annulla')} className="w-full text-left px-4 py-3 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-sm transition-colors flex items-center gap-2">✕ Annulla appuntamento</button>
            <button onClick={eliminaDef} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm transition-colors flex items-center gap-2">🗑 Elimina definitivamente</button>
          </div>
        )}
        {modo === 'data' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipologia (opzionale)</label>
              <select value={nuovaTipId} onChange={e => setNuovaTipId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— non cambiare —</option>
                {tipologie.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.durata_minuti} min</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nuova data</label>
                <input type="date" value={nuovaData} onChange={e => setNuovaData(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ora inizio</label>
                <input type="time" value={nuovaOra} onChange={e => setNuovaOra(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {tipSel && (
              <div className="px-3 py-2 rounded-lg text-xs text-gray-600"
                style={{ backgroundColor: `${tipSel.colore}15`, borderLeft: `3px solid ${tipSel.colore}` }}>
                ℹ️ {tipSel.durata_minuti} min — fine alle {fine(nuovaOra, tipSel.durata_minuti)}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModo('menu')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Indietro</button>
              <button onClick={salvaCambioData} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'Salva'}</button>
            </div>
          </div>
        )}
        {modo === 'sposta' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">L'appuntamento diventerà grigio e apparirà in Lista d'attesa → Spostamenti.</div>
            <div className="flex gap-2">
              <button onClick={() => setModo('menu')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Indietro</button>
              <button onClick={spostaInLista} disabled={saving} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">{saving ? '...' : 'Conferma'}</button>
            </div>
          </div>
        )}
        {modo === 'annulla' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">L'appuntamento sarà annullato e lo <strong>slot sarà reso disponibile</strong> in Lista d'attesa.</div>
            <div className="flex gap-2">
              <button onClick={() => setModo('menu')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Indietro</button>
              <button onClick={annulla} disabled={saving} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving ? '...' : 'Annulla appuntamento'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function DialogCliente({ onClose, onSaved, cliente, dopoSalvataggio }: Props) {
  const [nome, setNome] = useState(cliente?.nome || '')
  const [cognome, setCognome] = useState(cliente?.cognome || '')
  const [email, setEmail] = useState(cliente?.email || '')
  const [telefono, setTelefono] = useState(cliente?.telefono || '')
  const [note, setNote] = useState(cliente?.note || '')
  const [saving, setSaving] = useState(false)
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [tipologie, setTipologie] = useState<Tipologia[]>([])
  const [tabApp, setTabApp] = useState<'attivi' | 'annullati'>('attivi')
  const [nuovoApp, setNuovoApp] = useState(false)
  const [apptAzione, setApptAzione] = useState<Appuntamento | undefined>()
  const [filtroMeseDa, setFiltroMeseDa] = useState(0)
  const [filtroAnnoDa, setFiltroAnnoDa] = useState(annoCorrente)
  const [filtroMeseA, setFiltroMeseA] = useState(11)
  const [filtroAnnoA, setFiltroAnnoA] = useState(annoCorrente)
  // FIX: stato per aprire dialog appuntamento dopo salvataggio nuovo cliente
  const [nuovoClienteSalvato, setNuovoClienteSalvato] = useState<{ id: string; nome: string; cognome: string } | null>(null)

  useEffect(() => {
    if (cliente?.id) ricarica()
    supabase.from('tipologie').select('*').order('nome').then(({ data }) => { if (data) setTipologie(data) })
  }, [cliente])

  function ricarica() {
    supabase.from('appuntamenti').select('*').eq('cliente_id', cliente!.id)
      .order('data', { ascending: false })
      .then(({ data }) => { if (data) setAppuntamenti(data) })
  }

  const appFiltrati = appuntamenti.filter(a => {
    const da = `${filtroAnnoDa}-${String(filtroMeseDa + 1).padStart(2, '0')}-01`
    const al = `${filtroAnnoA}-${String(filtroMeseA + 1).padStart(2, '0')}-31`
    return a.data >= da && a.data <= al
  })
  const attivi    = appFiltrati.filter(a => a.stato !== 'cancellato')
  const annullati = appFiltrati.filter(a => a.stato === 'cancellato')
  const totAnnullati = appuntamenti.filter(a => a.stato === 'cancellato').length
  const lista = tabApp === 'attivi' ? attivi : annullati

  async function salva() {
    if (!cognome.trim()) return
    setSaving(true)
    if (cliente) {
      await supabase.from('clienti').update({ nome, cognome, email, telefono, note }).eq('id', cliente.id)
      setSaving(false)
      onSaved()
    } else {
      // Nuovo cliente
      const { data } = await supabase.from('clienti')
        .insert({ nome, cognome, email, telefono, note })
        .select()
        .single()
      setSaving(false)
      if (dopoSalvataggio === 'apri_appuntamento' && data) {
        // FIX: dopo aver creato il cliente, apri dialog appuntamento
        setNuovoClienteSalvato({ id: data.id, nome, cognome })
      } else {
        onSaved()
      }
    }
  }

  async function elimina() {
    if (!confirm(`Eliminare ${cliente?.nome} ${cliente?.cognome}?`)) return
    await supabase.from('clienti').delete().eq('id', cliente!.id)
    onSaved()
  }

  // Se il nuovo cliente è stato creato e dobbiamo aprire il dialog appuntamento
  if (nuovoClienteSalvato) {
    return (
      <DialogAppuntamento
        data={new Date().toISOString().split('T')[0]}
        clientePreselezionato={nuovoClienteSalvato}
        onClose={() => { setNuovoClienteSalvato(null); onSaved() }}
        onSaved={() => { setNuovoClienteSalvato(null); onSaved() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {cliente ? `${cliente.nome} ${cliente.cognome}` : 'Nuovo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Sinistra ── */}
          <div className="w-64 shrink-0 flex flex-col border-r border-gray-200">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cognome *</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefono</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} />
              </div>
              {totAnnullati > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600 flex items-center gap-2">
                  <span>✕</span>
                  <span><strong>{totAnnullati}</strong> appuntament{totAnnullati === 1 ? 'o' : 'i'} annullat{totAnnullati === 1 ? 'o' : 'i'}</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 space-y-2">
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
                <button onClick={salva} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? '...' : dopoSalvataggio === 'apri_appuntamento' ? 'Salva e prenota' : 'Salva'}
                </button>
              </div>
              {cliente && (
                <button onClick={elimina} className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
                  🗑 Elimina cliente
                </button>
              )}
            </div>
          </div>

          {/* ── Destra: appuntamenti ── */}
          {cliente && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex gap-1 px-4 pt-3 border-b border-gray-200">
                {(['attivi', 'annullati'] as const).map(t => (
                  <button key={t} onClick={() => setTabApp(t)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tabApp === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t === 'attivi' ? `📅 Attivi (${attivi.length})` : `✕ Annullati (${annullati.length})`}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Appuntamenti <span className="font-normal text-gray-400">({lista.length})</span></span>
                  <button onClick={() => setNuovoApp(true)} className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg hover:bg-blue-700">+</button>
                </div>

                {/* FIX: filtro periodo su UNA sola riga */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Da</span>
                  <select value={filtroMeseDa} onChange={e => setFiltroMeseDa(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={filtroAnnoDa} onChange={e => setFiltroAnnoDa(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span className="text-xs text-gray-400">→</span>
                  <select value={filtroMeseA} onChange={e => setFiltroMeseA(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {MESI.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={filtroAnnoA} onChange={e => setFiltroAnnoA(parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {ANNI.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {lista.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nessun appuntamento nel periodo.</p>
                ) : (
                  <div className="space-y-2">
                    {lista.map(a => {
                      const isInAttesa = a.stato === 'in_attesa_spostamento'
                      const isAnn = a.stato === 'cancellato'
                      const col = isInAttesa || isAnn ? '#D1D5DB' : (a.tipologia_colore || '#3B82F6')
                      return (
                        <div key={a.id}
                          onClick={() => !isAnn && setApptAzione(a)}
                          className={`border rounded-lg p-3 flex items-center justify-between transition-colors border-gray-200
                            ${isAnn ? 'opacity-50 cursor-default bg-gray-50' : 'cursor-pointer hover:bg-gray-50'}`}
                          style={{ borderLeft: `4px solid ${col}` }}>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`font-semibold text-sm ${isInAttesa || isAnn ? 'text-gray-400' : 'text-gray-800'}`}>{a.tipologia_nome}</p>
                              {isInAttesa && <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">⟳ In attesa</span>}
                            </div>
                            <div className={`flex items-center gap-3 text-xs ${isInAttesa || isAnn ? 'text-gray-400' : 'text-gray-500'}`}>
                              <span className="flex items-center gap-1"><IconCal />{formatDataConGiorno(a.data)}</span>
                              <span className="flex items-center gap-1"><IconClk />{a.ora_inizio}–{a.ora_fine}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${isAnn ? 'bg-red-100 text-red-600' : isInAttesa ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>
                            {isAnn ? 'Annullato' : isInAttesa ? 'In attesa' : 'Programmato'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {apptAzione && cliente && (
        <DialogAzione
          appt={apptAzione}
          clienteNome={`${cliente.nome} ${cliente.cognome}`}
          clienteTel={cliente.telefono} clienteEmail={cliente.email}
          tipologie={tipologie}
          onClose={() => setApptAzione(undefined)}
          onSaved={() => { setApptAzione(undefined); ricarica() }}
        />
      )}
      {nuovoApp && cliente && (
        <DialogAppuntamento
          data={new Date().toISOString().split('T')[0]}
          onClose={() => setNuovoApp(false)}
          onSaved={() => { setNuovoApp(false); ricarica() }}
        />
      )}
    </div>
  )
}
