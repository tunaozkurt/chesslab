import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-white text-lg font-semibold">Yakında</h2>
        <p className="text-zinc-500 text-sm mt-1">Bu modül sonraki sprintlerde gelecek.</p>
      </div>
    </div>
  )
}
