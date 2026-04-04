'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('ccm_utente')
    if (!raw) {
      router.push('/login')
      return
    }
    const u = JSON.parse(raw)
    if (!u.accesso_calendario && u.ruolo !== 'admin') {
      router.push('/login')
      return
    }
    setPronto(true)
  }, [])

  if (!pronto) return null

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <div id="cal-sidebar">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
