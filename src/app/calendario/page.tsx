'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'

const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export default function Calendario() {
  const [dataCorrente, setDataCorrente] = useState(new Date())

  const inizioMese = startOfMonth(dataCorrente)
  const fineMese = endOfMonth(dataCorrente)
  const inizioCalendario = startOfWeek(inizioMese, { weekStartsOn: 1 })
  const fineCalendario = endOfWeek(fineMese, { weekStartsOn: 1 })
  const giorni = eachDayOfInterval({ start: inizioCalendario, end: fineCalendario })

  return (
    <AppLayout>
      <div className="p-6 flex flex-col" style={{ height: '100vh', minWidth: '700px', overflowX: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setDataCorrente(subMonths(dataCorrente, 1))} className="p-2 hover:bg-gray-100 rounded-lg">‹</button>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {format(dataCorrente, 'MMMM yyyy', { locale: it })}
            </h2>
            <button onClick={() => setDataCorrente(addMonths(dataCorrente, 1))} className="p-2 hover:bg-gray-100 rounded-lg">›</button>
            <button onClick={() => setDataCorrente(new Date())} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Oggi</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
  <button className="px-3 py-1.5 text-sm bg-blue-600 text-white">Mese</button>
  <button className="px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-600">Settimana</button>
  <button className="px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-600">Giorno</button>
</div>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ Nuovo</button>
            <button className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-100">🖨 Stampa</button>
          </div>
        </div>

        {/* Griglia calendario */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-auto">
          {/* Intestazione giorni */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {giorniSettimana.map(g => (
              <div key={g} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
                {g}
              </div>
            ))}
          </div>

          {/* Celle giorni */}
          <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${giorni.length / 7}, 1fr)` }}>
            {giorni.map((giorno, i) => {
              const isOggi = isSameDay(giorno, new Date())
              const isMeseCorrente = isSameMonth(giorno, dataCorrente)
              const isSabDom = giorno.getDay() === 0 || giorno.getDay() === 6

              return (
                <div
                  key={i}
                  className={`border-b border-r border-gray-200 p-1 min-h-[120px] cursor-pointer hover:bg-blue-50 transition-colors ${
                    !isMeseCorrente ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                    isOggi
                      ? 'bg-blue-600 text-white font-semibold'
                      : isSabDom && isMeseCorrente
                      ? 'text-red-400'
                      : !isMeseCorrente
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}>
                    {format(giorno, 'd')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}