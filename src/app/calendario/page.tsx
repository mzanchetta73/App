import AppLayout from '@/components/layout/AppLayout'

export default function Calendario() {
  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-800">Calendario</h1>
        <p className="text-gray-500 mt-2">Qui apparirà il calendario degli appuntamenti.</p>
      </div>
    </AppLayout>
  )
}