'use client'

import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
