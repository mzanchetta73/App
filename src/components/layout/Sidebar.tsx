'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const IconCalendario = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconClienti = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconListaAttesa = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/>
  </svg>
)
const IconTipologie = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)

const menuItems = [
  { href: '/calendario',   label: 'Calendario',     Icon: IconCalendario  },
  { href: '/clienti',      label: 'Clienti',         Icon: IconClienti     },
  { href: '/lista-attesa', label: "Lista d'attesa",  Icon: IconListaAttesa },
  { href: '/tipologie',    label: 'Tipologie',       Icon: IconTipologie   },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
            <IconCalendario />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">CorpoCosciente</h1>
            <p className="text-[10px] text-gray-400 leading-tight">Mente</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
              <span className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`}><Icon /></span>
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center font-medium tracking-wide">CorpoCoscienteMente®</p>
      </div>
    </div>
  )
}
