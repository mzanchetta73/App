'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useState, useEffect, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays
} from 'date-fns'
import { it } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import DialogAppuntamento from '@/components/calendario/DialogAppuntamento'
import DialogFissaAppuntamento from '@/components/lista-attesa/DialogFissaAppuntamento'
import DialogCliente from '@/components/clienti/DialogCliente'
import DialogRichiesta from '@/components/lista-attesa/DialogRichiesta'
import DialogPeriodoBloccato, { PeriodoBloccato } from '@/components/calendario/DialogPeriodoBloccato'

const GIORNI_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
const HOUR_H = 64
const START_H = 8
const END_H   = 23
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => i + START_H)

type Vista = 'mese' | 'settimana' | 'giorno'

interface Appuntamento {
  id: string; cliente_id: string; cliente_nome: string
  tipologia_nome: string; tipologia_colore: string
  data: string; ora_inizio: string; ora_fine: string; stato: string; note: string
}
interface Tipologia { id: string; nome: string; durata_minuti: number; colore: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcolaEaster(y: number): Date {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7
  const m=Math.floor((a+11*h+22*l)/451)
  const mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1
  return new Date(y,mo-1,da)
}
function getFestivita(y: number): Map<string,string> {
  const m=new Map<string,string>()
  m.set(`${y}-01-01`,'Capodanno'); m.set(`${y}-01-06`,'Epifania')
  m.set(`${y}-04-25`,'Liberazione'); m.set(`${y}-05-01`,'Lavoro')
  m.set(`${y}-06-02`,'Repubblica'); m.set(`${y}-08-15`,'Ferragosto')
  m.set(`${y}-11-01`,'Ognissanti'); m.set(`${y}-12-08`,'Immacolata')
  m.set(`${y}-12-25`,'Natale'); m.set(`${y}-12-26`,'S.Stefano')
  const p=calcolaEaster(y); m.set(format(p,'yyyy-MM-dd'),'Pasqua')
  const pm=new Date(p); pm.setDate(pm.getDate()+1); m.set(format(pm,'yyyy-MM-dd'),'Pasquetta')
  return m
}
function timeToMinutes(t: string) { const [h,m]=t.split(':').map(Number); return h*60+m }
function coloreApp(app: Appuntamento) {
  if (['in_attesa_spostamento','cancellato'].includes(app.stato)) return '#9CA3AF'
  return app.tipologia_colore || '#3B82F6'
}
function getBlocchi(periodi: PeriodoBloccato[], dataStr: string) {
  return periodi.filter(p => p.data_inizio <= dataStr && p.data_fine >= dataStr)
}
// Formatta ora: mostra solo HH:MM (tronca i secondi se presenti)
function formatOra(ora: string) { return ora.substring(0, 5) }

// ─── Menu contestuale giorno ──────────────────────────────────────────────────
function MenuGiorno({ data, pos, hasBlocchi, onNuovoApp, onNuovaRichiesta, onNuovoCliente, onBlocca, onClose }: {
  data:string; pos:{x:number;y:number}; hasBlocchi:boolean
  onNuovoApp:()=>void; onNuovaRichiesta:()=>void; onNuovoCliente:()=>void
  onBlocca:()=>void; onClose:()=>void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h=(e:MouseEvent)=>{ if(ref.current&&!ref.current.contains(e.target as Node))onClose() }
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  },[onClose])
  return (
    <div ref={ref} className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-56"
      style={{top:Math.min(pos.y,window.innerHeight-240),left:Math.min(pos.x,window.innerWidth-230)}}>
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {format(new Date(data+'T00:00:00'),'d MMMM yyyy',{locale:it})}
        </p>
      </div>
      <button onClick={()=>{onNuovoApp();onClose()}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center gap-2">📅 Nuovo appuntamento</button>
      <button onClick={()=>{onNuovaRichiesta();onClose()}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 flex items-center gap-2">🔄 Nuova richiesta</button>
      <button onClick={()=>{onNuovoCliente();onClose()}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 flex items-center gap-2">👤 Nuovo cliente</button>
      <div className="border-t border-gray-100 mt-1 pt-1">
        <button onClick={()=>{onBlocca();onClose()}}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-purple-50 flex items-center gap-2 text-purple-700">
          {hasBlocchi ? 'Modifica / rimuovi blocco' : 'Blocca giornata'}
        </button>
      </div>
    </div>
  )
}

// ─── Dialog azioni appuntamento ───────────────────────────────────────────────
function DialogAzione({ app, tipologie, onClose, onSaved, onApriRichiesta }: {
  app:Appuntamento; tipologie:Tipologia[]
  onClose:()=>void; onSaved:()=>void; onApriRichiesta:(id:string)=>void
}) {
  const [modo,setModo]=useState<'menu'|'data'|'annulla'>('menu')
  const [nuovaData,setNuovaData]=useState(app.data)
  const [nuovaOra,setNuovaOra]=useState(app.ora_inizio)
  const [nuovaTipId,setNuovaTipId]=useState('')
  const [saving,setSaving]=useState(false)

  function calFine(ini:string,dur:number){
    const [h,m]=ini.split(':').map(Number),t=h*60+m+dur
    return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`
  }
  async function salvaCambioData(){
    setSaving(true)
    const t=tipologie.find(t=>t.id===nuovaTipId)
    const oraFineCalc=t?calFine(nuovaOra,t.durata_minuti):app.ora_fine
    // Controllo sovrapposizione
    const {data:overlap}=await supabase.from('appuntamenti')
      .select('id,cliente_nome,ora_inizio,ora_fine')
      .eq('data',nuovaData).neq('stato','cancellato').neq('id',app.id)
      .lt('ora_inizio',oraFineCalc).gt('ora_fine',nuovaOra)
    if(overlap&&overlap.length>0){
      const o=overlap[0]
      alert(`Sovrapposizione con: ${o.cliente_nome} (${formatOra(o.ora_inizio)}–${formatOra(o.ora_fine)}).\nScegli un orario libero.`)
      setSaving(false); return
    }
    await supabase.from('appuntamenti').update({
      data:nuovaData,ora_inizio:nuovaOra,
      ora_fine:oraFineCalc,
      stato:'programmato',
      ...(t?{tipologia_id:t.id,tipologia_nome:t.nome,tipologia_colore:t.colore}:{})
    }).eq('id',app.id)
    setSaving(false);onSaved()
  }
  async function annullaApp(){
    setSaving(true)
    await supabase.from('appuntamenti').update({stato:'cancellato'}).eq('id',app.id)
    await supabase.from('lista_attesa').insert({
      tipo:'slot_liberato',tipo_richiesta:'slot_liberato',
      appuntamento_id:app.id,cliente_nome:app.cliente_nome,
      stato:'in_attesa',data_richiesta:new Date().toISOString().split('T')[0],
      mese_preferito:app.data.substring(0,7),
    })
    setSaving(false);onSaved()
  }
  async function eliminaDef(){
    if(!confirm('Eliminare definitivamente questo appuntamento?'))return
    setSaving(true)
    await supabase.from('lista_attesa').insert({
      tipo:'slot_liberato',tipo_richiesta:'slot_liberato',
      appuntamento_id:app.id,cliente_nome:app.cliente_nome,
      stato:'in_attesa',data_richiesta:new Date().toISOString().split('T')[0],
      mese_preferito:app.data.substring(0,7),
    })
    await supabase.from('appuntamenti').delete().eq('id',app.id)
    setSaving(false);onSaved()
  }

  // "Sposta in lista d'attesa": mette in_attesa_spostamento e crea voce lista_attesa
  async function spostaInLista(){
    setSaving(true)
    await supabase.from('appuntamenti').update({stato:'in_attesa_spostamento'}).eq('id',app.id)
    const {data:es}=await supabase.from('lista_attesa').select('id')
      .eq('appuntamento_id',app.id).eq('tipo','spostamento').maybeSingle()
    if(!es){
      await supabase.from('lista_attesa').insert({
        tipo:'spostamento',tipo_richiesta:'spostamento',
        appuntamento_id:app.id,cliente_nome:app.cliente_nome,
        stato:'in_attesa',data_richiesta:new Date().toISOString().split('T')[0],
      })
    }
    setSaving(false);onSaved()
  }

  const tipSel=tipologie.find(t=>t.id===nuovaTipId)
  const isInAttesa=app.stato==='in_attesa_spostamento'
  const col=isInAttesa?'#D1D5DB':(app.tipologia_colore||'#3B82F6')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Appuntamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-3 py-2.5 rounded-lg mb-4 text-sm"
          style={{borderLeft:`4px solid ${col}`,backgroundColor:`${col}12`}}>
          <p className={`font-semibold mb-0.5 ${isInAttesa?'text-gray-400':'text-gray-800'}`}>{app.cliente_nome}</p>
          <p className={`text-xs ${isInAttesa?'text-gray-400':'text-gray-600'}`}>
            {app.tipologia_nome} · {new Date(app.data+'T00:00:00').toLocaleDateString('it-IT')} {formatOra(app.ora_inizio)}–{formatOra(app.ora_fine)}
          </p>
          {isInAttesa&&<p className="text-xs text-amber-600 mt-1 font-medium">⟳ In attesa di spostamento — gestibile solo da Lista d'attesa</p>}
        </div>

        {modo==='menu'&&(
          <div className="space-y-2">
            <button onClick={()=>setModo('data')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-sm flex items-center gap-2">📅 Cambia data / ora</button>
            {/* Sposta: solo se NON già in attesa */}
            {!isInAttesa&&(
              <button onClick={spostaInLista} disabled={saving} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-sm flex items-center gap-2 disabled:opacity-50">
                🔄 Sposta in lista d'attesa
              </button>
            )}
            <button onClick={()=>setModo('annulla')} className="w-full text-left px-4 py-3 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-sm flex items-center gap-2">✕ Annulla appuntamento</button>
            <button onClick={eliminaDef} disabled={saving} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm flex items-center gap-2 disabled:opacity-50">🗑 Elimina definitivamente</button>
          </div>
        )}
        {modo==='data'&&(
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipologia (opzionale)</label>
              <select value={nuovaTipId} onChange={e=>setNuovaTipId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— non cambiare —</option>
                {tipologie.map(t=><option key={t.id} value={t.id}>{t.nome} — {t.durata_minuti} min</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nuova data</label>
                <input type="date" value={nuovaData} onChange={e=>setNuovaData(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Ora inizio</label>
                <input type="time" value={nuovaOra} onChange={e=>setNuovaOra(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            {tipSel&&(
              <div className="px-3 py-2 rounded-lg text-xs text-gray-600"
                style={{backgroundColor:`${tipSel.colore}15`,borderLeft:`3px solid ${tipSel.colore}`}}>
                ℹ️ {tipSel.durata_minuti} min — fine alle {calFine(nuovaOra,tipSel.durata_minuti)}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setModo('menu')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Indietro</button>
              <button onClick={salvaCambioData} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving?'...':'Salva'}</button>
            </div>
          </div>
        )}
        {modo==='annulla'&&(
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
              Lo slot sarà disponibile in Lista d'attesa → <strong>Appuntamenti liberati</strong>.
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setModo('menu')} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Indietro</button>
              <button onClick={annullaApp} disabled={saving} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving?'...':'Annulla appuntamento'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vista Settimana (SENZA drag) ─────────────────────────────────────────────
function VistaSettimana({ dataCorrente, appuntamenti, periodi, festivita, onClickApp, onClickGiorno, onClickBlocco }: {
  dataCorrente:Date; appuntamenti:Appuntamento[]; periodi:PeriodoBloccato[]
  festivita:Map<string,string>
  onClickApp:(e:React.MouseEvent,a:Appuntamento)=>void
  onClickGiorno:(e:React.MouseEvent,d:string)=>void
  onClickBlocco:(e:React.MouseEvent,p:PeriodoBloccato)=>void
}) {
  const giorni=eachDayOfInterval({
    start:startOfWeek(dataCorrente,{weekStartsOn:1}),
    end:endOfWeek(dataCorrente,{weekStartsOn:1})
  })
  return (
    <div className="flex-1 border border-gray-200 rounded-lg overflow-auto bg-white">
      {/* Header giorni */}
      <div className="grid sticky top-0 z-10 bg-white border-b border-gray-200" style={{gridTemplateColumns:'52px repeat(7,1fr)'}}>
        <div className="border-r border-gray-200"/>
        {giorni.map((g,i)=>{
          const isOggi=isSameDay(g,new Date())
          const dataStr=format(g,'yyyy-MM-dd')
          const fest=festivita.get(dataStr)
          const blocchi=getBlocchi(periodi,dataStr)
          return (
            <div key={i} className={`py-2 px-1 text-center border-r border-gray-200 ${isOggi?'bg-blue-50':''}`}>
              <div className={`text-[11px] font-medium uppercase tracking-wide ${i>=5?'text-red-400':'text-gray-400'}`}>{GIORNI_SHORT[i]}</div>
              <div className={`text-base font-semibold mt-0.5 w-8 h-8 mx-auto rounded-full flex items-center justify-center
                ${isOggi?'bg-blue-600 text-white':'text-gray-700'}`}>
                {format(g,'d')}
              </div>
              {fest&&<div className="text-[9px] text-red-500 font-medium truncate mt-0.5">{fest}</div>}
              {/* Blocco: solo testo, niente simbolo */}
              {blocchi[0]&&(
                <div className="text-[9px] font-medium truncate cursor-pointer hover:opacity-70 mt-0.5"
                  style={{color:blocchi[0].colore}} onClick={e=>onClickBlocco(e,blocchi[0])}>
                  {blocchi[0].titolo}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Griglia ore */}
      <div className="relative">
        {/* Righe sfondo bianco con linee sottili */}
        <div className="grid" style={{gridTemplateColumns:'52px repeat(7,1fr)'}}>
          {HOURS.map(h=>(
            <div key={h} className="contents">
              {/* Ora: solo HH */}
              <div className="text-right pr-2 text-[11px] text-gray-300 border-r border-gray-100 select-none flex-shrink-0"
                style={{height:HOUR_H,paddingTop:3,lineHeight:'1'}}>
                {String(h).padStart(2,'0')}
              </div>
              {giorni.map((_,di)=>(
                <div key={di} className="border-r border-gray-100 bg-white"
                  style={{height:HOUR_H,borderBottom:'1px solid #e2e8f0'}}
                  onClick={e=>onClickGiorno(e,format(giorni[di],'yyyy-MM-dd'))}>
                  {/* Linea mezzora */}
                  <div style={{marginTop:HOUR_H/2,borderTop:'1px dashed #e2e8f0'}}/>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Appuntamenti in overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{left:52}}>
          <div className="grid h-full" style={{gridTemplateColumns:`repeat(7,1fr)`}}>
            {giorni.map((g,di)=>{
              const dataStr=format(g,'yyyy-MM-dd')
              const appG=appuntamenti.filter(a=>a.data===dataStr&&a.stato!=='cancellato')
              const blocchi=getBlocchi(periodi,dataStr)
              return (
                <div key={di} className="relative border-r border-gray-200">
                  {/* Blocco: sfondo colorato leggero, NO simbolo */}
                  {blocchi[0]&&(
                    <div className="absolute inset-0 pointer-events-none"
                      style={{backgroundColor:blocchi[0].colore+'14'}}/>
                  )}
                  {appG.map(a=>{
                    const startMin=timeToMinutes(a.ora_inizio)-START_H*60
                    const endMin=timeToMinutes(a.ora_fine)-START_H*60
                    const top=Math.max(0,(startMin/60)*HOUR_H)
                    const height=Math.max(20,((endMin-startMin)/60)*HOUR_H-4)
                    return (
                      <div key={a.id}
                        onClick={e=>{e.stopPropagation();onClickApp(e,a)}}
                        className={`absolute left-0.5 right-0.5 rounded text-white text-xs px-1 py-0.5 overflow-hidden cursor-pointer hover:opacity-80 pointer-events-auto shadow-sm
                          ${a.stato==='in_attesa_spostamento'?'opacity-60':''}`}
                        style={{top,height,backgroundColor:coloreApp(a)}}>
                        <div className="font-medium truncate leading-tight">{formatOra(a.ora_inizio)} {a.cliente_nome}</div>
                        {height>32&&<div className="truncate opacity-80 leading-tight text-[10px]">{a.tipologia_nome}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Vista Giorno (SENZA drag) ────────────────────────────────────────────────
function VistaGiorno({ dataCorrente, appuntamenti, periodi, festivita, onClickApp, onClickGiorno }: {
  dataCorrente:Date; appuntamenti:Appuntamento[]; periodi:PeriodoBloccato[]
  festivita:Map<string,string>
  onClickApp:(e:React.MouseEvent,a:Appuntamento)=>void
  onClickGiorno:(e:React.MouseEvent,d:string)=>void
}) {
  const dataStr=format(dataCorrente,'yyyy-MM-dd')
  const appGiorno=appuntamenti.filter(a=>a.data===dataStr&&a.stato!=='cancellato')
  const fest=festivita.get(dataStr)
  const blocchi=getBlocchi(periodi,dataStr)

  return (
    <div className="flex-1 border border-gray-200 rounded-lg overflow-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold w-12 h-12 rounded-full flex items-center justify-center
            ${isSameDay(dataCorrente,new Date())?'bg-blue-600 text-white':'text-gray-800'}`}>
            {format(dataCorrente,'d')}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800 capitalize">{format(dataCorrente,'EEEE',{locale:it})}</div>
            <div className="text-xs text-gray-400">{format(dataCorrente,'MMMM yyyy',{locale:it})}</div>
          </div>
          {fest&&<span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">{fest}</span>}
          {/* Blocco: solo badge colorato, NO simbolo */}
          {blocchi[0]&&(
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{backgroundColor:blocchi[0].colore+'20',color:blocchi[0].colore}}>
              {blocchi[0].titolo}
            </span>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Colonna ore — solo numero ora */}
        <div className="w-14 flex-shrink-0 border-r border-gray-100 bg-white">
          {HOURS.map(h=>(
            <div key={h} className="text-right pr-2 text-[11px] text-gray-300 select-none"
              style={{height:HOUR_H,paddingTop:3,lineHeight:'1'}}>
              {String(h).padStart(2,'0')}
            </div>
          ))}
        </div>

        {/* Colonna eventi */}
        <div className="flex-1 relative" onClick={e=>onClickGiorno(e,dataStr)}>
          {/* Righe orarie — sfondo bianco, solo bordo sottile */}
          {HOURS.map(h=>(
            <div key={h} className="bg-white"
              style={{height:HOUR_H,borderBottom:'1px solid #e2e8f0'}}>
              <div style={{marginTop:HOUR_H/2,borderTop:'1px dashed #e2e8f0'}}/>
            </div>
          ))}

          {/* Blocco periodo: solo sfondo lieve, niente icone */}
          {blocchi[0]&&(
            <div className="absolute inset-0 pointer-events-none"
              style={{backgroundColor:blocchi[0].colore+'10'}}/>
          )}

          {/* Appuntamenti */}
          {appGiorno.map(a=>{
            const startMin=timeToMinutes(a.ora_inizio)-START_H*60
            const endMin=timeToMinutes(a.ora_fine)-START_H*60
            const top=Math.max(0,(startMin/60)*HOUR_H)
            const height=Math.max(24,((endMin-startMin)/60)*HOUR_H-6)
            return (
              <div key={a.id}
                onClick={e=>{e.stopPropagation();onClickApp(e,a)}}
                className={`absolute left-2 right-2 rounded-lg text-white px-2 py-1 overflow-hidden cursor-pointer hover:opacity-80 shadow-sm
                  ${a.stato==='in_attesa_spostamento'?'opacity-60':''}`}
                style={{top,height,backgroundColor:coloreApp(a)}}>
                <div className="font-semibold text-sm truncate">{formatOra(a.ora_inizio)}–{formatOra(a.ora_fine)}</div>
                <div className="text-sm truncate">{a.cliente_nome}</div>
                {height>56&&<div className="text-xs opacity-80 truncate">{a.tipologia_nome}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principale ────────────────────────────────────────────────────────
export default function Calendario() {
  const [dataCorrente,setDataCorrente]=useState(new Date())
  const [vista,setVista]=useState<Vista>('mese')
  const [appuntamenti,setAppuntamenti]=useState<Appuntamento[]>([])
  const [tipologie,setTipologie]=useState<Tipologia[]>([])
  const [periodi,setPeriodi]=useState<PeriodoBloccato[]>([])

  const [menuGiorno,setMenuGiorno]=useState<{data:string;pos:{x:number;y:number}}|null>(null)
  const [dialogNuovoApp,setDialogNuovoApp]=useState(false)
  const [dataSelezionata,setDataSelezionata]=useState('')
  const [appAzione,setAppAzione]=useState<Appuntamento|null>(null)
  const [dialogRichiesta,setDialogRichiesta]=useState(false)
  const [appIdRichiesta,setAppIdRichiesta]=useState<string|null>(null)
  const [dialogNuovoCliente,setDialogNuovoCliente]=useState(false)
  const [dialogFissa,setDialogFissa]=useState(false)
  const [richiestaFissa,setRichiestaFissa]=useState<any>(null)
  const [dialogBlocco,setDialogBlocco]=useState(false)
  const [periodoSelezionato,setPeriodoSelezionato]=useState<PeriodoBloccato|undefined>()
  const [dataDefaultBlocco,setDataDefaultBlocco]=useState<string|undefined>()

  const festivita=getFestivita(dataCorrente.getFullYear())

  useEffect(()=>{
    carica(); caricaPeriodi()
    supabase.from('tipologie').select('*').order('nome').then(({data})=>{if(data)setTipologie(data)})
  },[])

  async function carica(){
    const {data}=await supabase.from('appuntamenti').select('*').order('ora_inizio')
    if(data)setAppuntamenti(data)
  }
  async function caricaPeriodi(){
    const {data}=await supabase.from('periodi_bloccati').select('*').order('data_inizio')
    if(data)setPeriodi(data as PeriodoBloccato[])
  }

  function checkOverlap(data:string,oraInizio:string,oraFine:string,excludeId?:string):boolean {
    const startMin=timeToMinutes(oraInizio),endMin=timeToMinutes(oraFine)
    return appuntamenti.some(a=>{
      if(a.data!==data||a.stato==='cancellato'||(excludeId&&a.id===excludeId))return false
      return startMin<timeToMinutes(a.ora_fine)&&endMin>timeToMinutes(a.ora_inizio)
    })
  }
  function checkBloccato(dataStr:string):PeriodoBloccato|undefined {
    return periodi.find(p=>p.data_inizio<=dataStr&&p.data_fine>=dataStr)
  }

  function navigaPrev(){
    if(vista==='mese')setDataCorrente(subMonths(dataCorrente,1))
    else if(vista==='settimana')setDataCorrente(subWeeks(dataCorrente,1))
    else setDataCorrente(subDays(dataCorrente,1))
  }
  function navigaNext(){
    if(vista==='mese')setDataCorrente(addMonths(dataCorrente,1))
    else if(vista==='settimana')setDataCorrente(addWeeks(dataCorrente,1))
    else setDataCorrente(addDays(dataCorrente,1))
  }
  function getTitolo(){
    if(vista==='mese')return format(dataCorrente,'MMMM yyyy',{locale:it})
    if(vista==='settimana'){
      const s=startOfWeek(dataCorrente,{weekStartsOn:1}),e=endOfWeek(dataCorrente,{weekStartsOn:1})
      return `${format(s,'d')} – ${format(e,'d MMMM yyyy',{locale:it})}`
    }
    return format(dataCorrente,'EEEE d MMMM yyyy',{locale:it})
  }

  function clickGiorno(e:React.MouseEvent,dataStr:string){
    e.stopPropagation()
    setMenuGiorno({data:dataStr,pos:{x:e.clientX,y:e.clientY}})
  }
  function apriNuovoAppuntamento(data:string){
    const blocco=checkBloccato(data)
    if(blocco){
      alert(`Giornata bloccata: ${blocco.titolo}\nNon è possibile inserire appuntamenti in questo periodo.`)
      return
    }
    setDataSelezionata(data); setDialogNuovoApp(true)
  }
  function clickApp(e:React.MouseEvent,app:Appuntamento){
    e.stopPropagation()
    // Appuntamento in attesa spostamento: apri solo DialogFissa (non modificabile dal calendario)
    if(app.stato==='in_attesa_spostamento'){
      supabase.from('lista_attesa').select('id,cliente_nome,telefono,email,tipo')
        .eq('appuntamento_id',app.id).eq('stato','in_attesa').maybeSingle()
        .then(({data})=>{ if(data){setRichiestaFissa(data);setDialogFissa(true)} })
      return
    }
    setAppAzione(app)
  }
  function clickBlocco(e:React.MouseEvent,p:PeriodoBloccato){
    e.stopPropagation(); setPeriodoSelezionato(p); setDialogBlocco(true)
  }

  const inizio=startOfMonth(dataCorrente)
  const fineM=endOfMonth(dataCorrente)
  const giorni=eachDayOfInterval({start:startOfWeek(inizio,{weekStartsOn:1}),end:endOfWeek(fineM,{weekStartsOn:1})})

  return (
    <>
      <style>{`
        @media print {
          #cal-nav-buttons, .w-60, #cal-sidebar, aside { display: none !important; }
          #cal-print-title { display: block !important; font-size:14px; font-weight:700; text-align:center; margin-bottom:4px; text-transform:capitalize; }
          html, body { margin:0; padding:0; background:white !important; overflow:hidden !important; }
          .p-6 { padding:2mm !important; }
          .flex-1 { overflow:hidden !important; }
          /* Rimuovi tutti gli sfondi colorati dalla stampa */
          [class*="bg-"] { background-color: white !important; }
          [class*="bg-red-50"], [class*="bg-blue-50"] { background-color: white !important; }
          .grid > div { background: white !important; }
          div[style*="gridTemplateRows"] > div { min-height: unset !important; }
          div[style*="minWidth"] { min-width: unset !important; }
          .text-xs { font-size:7px !important; line-height:1.1 !important; }
          .w-7,.h-7 { width:14px !important; height:14px !important; font-size:7px !important; }
          .space-y-1 > *+* { margin-top:1px !important; }
          .px-1\\.5 { padding:1px !important; }
          * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
          @page { size:A4 landscape; margin:3mm; }
        }
        @media screen { #cal-print-title { display:none; } }
      `}</style>

      <AppLayout>
        <div className="p-6 flex flex-col" style={{height:'100vh',minWidth:'700px',overflowX:'auto'}}>
          <div id="cal-print-title">{format(dataCorrente,'MMMM yyyy',{locale:it})}</div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={navigaPrev} className="p-2 hover:bg-gray-100 rounded-lg text-lg">‹</button>
              <h2 className="text-lg font-semibold text-gray-800 capitalize">{getTitolo()}</h2>
              <button onClick={navigaNext} className="p-2 hover:bg-gray-100 rounded-lg text-lg">›</button>
              <button onClick={()=>setDataCorrente(new Date())} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Oggi</button>
            </div>
            <div id="cal-nav-buttons" className="flex items-center gap-2">
              <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
                {(['mese','settimana','giorno'] as Vista[]).map(v=>(
                  <button key={v} onClick={()=>setVista(v)}
                    className={`px-3 py-1.5 capitalize transition-colors ${vista===v?'bg-blue-600 text-white':'hover:bg-gray-100 text-gray-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={()=>apriNuovoAppuntamento(format(new Date(),'yyyy-MM-dd'))}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">+ Nuovo</button>
              <button onClick={()=>{setDataDefaultBlocco(format(new Date(),'yyyy-MM-dd'));setPeriodoSelezionato(undefined);setDialogBlocco(true)}}
                className="px-3 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50 font-medium">
                Blocca
              </button>
              <button onClick={()=>window.print()} className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-100">🖨 Stampa</button>
            </div>
          </div>

          {/* ── Vista Mese ── */}
          {vista==='mese'&&(
            <div className="flex-1 border border-gray-200 rounded-lg overflow-auto bg-white">
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
  {GIORNI_SHORT.map((g,i)=>(
    <div key={g} className={`py-2 text-center text-xs font-medium uppercase border-r border-gray-200 ${i>=5?'text-red-400':'text-gray-500'}`}>{g}</div>
  ))}
</div>
              <div className="grid grid-cols-7" style={{gridTemplateRows:`repeat(${giorni.length/7},minmax(110px,1fr))`}}>
                {giorni.map((giorno,i)=>{
                  const isOggi=isSameDay(giorno,new Date())
                  const isMese=isSameMonth(giorno,dataCorrente)
                  const isSabDom=giorno.getDay()===0||giorno.getDay()===6
                  const dataStr=format(giorno,'yyyy-MM-dd')
                  const appGiorno=appuntamenti.filter(a=>a.data===dataStr&&a.stato!=='cancellato')
                  const fest=festivita.get(dataStr)
                  const primoBlocco=getBlocchi(periodi,dataStr)[0]

                  // Stile cella: sfondo solo da blocco (non grigio generico)
                  const cellStyle:React.CSSProperties={}
                  if(primoBlocco&&isMese){
                    cellStyle.backgroundColor=primoBlocco.colore+'18'
                    cellStyle.borderLeft=`3px solid ${primoBlocco.colore}`
                  }

                  return (
                    <div key={i}
                      onClick={e=>isMese&&clickGiorno(e,dataStr)}
                      className={`border-b border-r border-gray-200 p-1.5 transition-colors group
                        ${!isMese?'bg-gray-50/50':'bg-white'}
                        ${isMese&&fest&&!primoBlocco?'bg-red-50/30':''}
                        ${isMese&&isSabDom&&!primoBlocco&&!fest?'bg-slate-50/80':''}
                        ${isMese?'cursor-pointer hover:bg-blue-50/40':'cursor-default'}
                        ${isOggi?'ring-1 ring-inset ring-blue-400':''}`}
                      style={cellStyle}>
                      <div className="flex items-start justify-between mb-0.5">
                        <div className="flex flex-col items-start min-w-0 flex-1 mr-1">
                          {fest&&isMese&&<span className="text-[9px] text-red-500 font-medium leading-tight truncate w-full">{fest}</span>}
                          {/* Blocco mese: solo testo senza simbolo */}
                          {primoBlocco&&isMese&&(
                            <button onClick={e=>clickBlocco(e,primoBlocco)}
                              className="text-[9px] font-semibold leading-tight truncate w-full text-left hover:opacity-70"
                              style={{color:primoBlocco.colore}}>
                              {primoBlocco.titolo}
                            </button>
                          )}
                        </div>
                        <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full flex-shrink-0
                          ${isOggi?'bg-blue-600 text-white font-semibold'
                            :fest&&isMese?'text-red-600 font-medium'
                            :isSabDom&&isMese?'text-red-400'
                            :!isMese?'text-gray-300':'text-gray-700'}`}>
                          {format(giorno,'d')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {appGiorno.map(a=>(
                          <div key={a.id}
                            onClick={e=>clickApp(e,a)}
                            title={`${formatOra(a.ora_inizio)} ${a.cliente_nome} — ${a.tipologia_nome}`}
                            className={`text-xs px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80
                              ${a.stato==='in_attesa_spostamento'?'opacity-60':''}`}
                            style={{backgroundColor:coloreApp(a)}}>
                            {a.stato==='in_attesa_spostamento'&&'⟳ '}
                            {formatOra(a.ora_inizio)} {a.cliente_nome}
                          </div>
                        ))}
                        {appGiorno.length===0&&isMese&&(
                          <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">+ aggiungi</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Vista Settimana ── */}
          {vista==='settimana'&&(
            <VistaSettimana
              dataCorrente={dataCorrente} appuntamenti={appuntamenti}
              periodi={periodi} festivita={festivita}
              onClickApp={clickApp} onClickGiorno={clickGiorno} onClickBlocco={clickBlocco}
            />
          )}

          {/* ── Vista Giorno ── */}
          {vista==='giorno'&&(
            <VistaGiorno
              dataCorrente={dataCorrente} appuntamenti={appuntamenti}
              periodi={periodi} festivita={festivita}
              onClickApp={clickApp} onClickGiorno={clickGiorno}
            />
          )}
        </div>

        {/* Dialogs */}
        {menuGiorno&&(
          <MenuGiorno data={menuGiorno.data} pos={menuGiorno.pos}
            hasBlocchi={getBlocchi(periodi,menuGiorno.data).length>0}
            onNuovoApp={()=>{setMenuGiorno(null);apriNuovoAppuntamento(menuGiorno.data)}}
            onNuovaRichiesta={()=>{ setMenuGiorno(null); setDialogRichiesta(true) }}
            onNuovoCliente={()=>{ setMenuGiorno(null); setDialogNuovoCliente(true) }}
            onBlocca={()=>{
              const b=getBlocchi(periodi,menuGiorno.data)[0]
              if(b)setPeriodoSelezionato(b)
              else{setPeriodoSelezionato(undefined);setDataDefaultBlocco(menuGiorno.data)}
              setMenuGiorno(null); setDialogBlocco(true)
            }}
            onClose={()=>setMenuGiorno(null)}
          />
        )}
        {dialogNuovoApp&&<DialogAppuntamento data={dataSelezionata} onClose={()=>setDialogNuovoApp(false)} onSaved={()=>{setDialogNuovoApp(false);carica()}}/>}
        {appAzione&&(
          <DialogAzione app={appAzione} tipologie={tipologie}
            onClose={()=>setAppAzione(null)} onSaved={()=>{setAppAzione(null);carica()}}
            onApriRichiesta={(appId)=>{setAppIdRichiesta(appId);setAppAzione(null);setDialogRichiesta(true)}}
          />
        )}
        {dialogRichiesta&&(
          <DialogRichiesta
            onClose={()=>{setDialogRichiesta(false);setAppIdRichiesta(null)}}
            onSaved={()=>{setDialogRichiesta(false);setAppIdRichiesta(null);carica()}}
            richiesta={appIdRichiesta?{id:'',tipo:'spostamento',tipo_richiesta:'spostamento',tipologia_id:'',cliente_nome:'',telefono:'',email:'',note:'',data_richiesta:new Date().toISOString().split('T')[0],mese_preferito:'',appuntamento_id:appIdRichiesta}as any:undefined}
          />
        )}
        {dialogNuovoCliente&&<DialogCliente onClose={()=>setDialogNuovoCliente(false)} onSaved={()=>{setDialogNuovoCliente(false);carica()}} dopoSalvataggio="apri_appuntamento"/>}
        {dialogFissa&&richiestaFissa&&<DialogFissaAppuntamento richiesta={richiestaFissa} onClose={()=>{setDialogFissa(false);setRichiestaFissa(null)}} onSaved={()=>{setDialogFissa(false);setRichiestaFissa(null);carica()}}/>}
        {dialogBlocco&&<DialogPeriodoBloccato periodo={periodoSelezionato} dataDefault={dataDefaultBlocco} onClose={()=>{setDialogBlocco(false);setPeriodoSelezionato(undefined)}} onSaved={()=>{setDialogBlocco(false);setPeriodoSelezionato(undefined);caricaPeriodi()}}/>}
      </AppLayout>
    </>
  )
}
