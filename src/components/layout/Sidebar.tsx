'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/calendario', label: 'Calendario', emoji: '📅' },
  { href: '/clienti', label: 'Clienti', emoji: '👤' },
  { href: '/lista-attesa', label: "Lista d'attesa", emoji: '⏳' },
  { href: '/tipologie', label: 'Tipologie', emoji: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <h1 className="text-lg font-bold text-gray-800">Agenda</h1>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{item.emoji}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">CorpoCoscienteMente®</p>
      </div>
    </div>
  )
}