import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TacticsContent } from '@/components/tactics/TacticsContent'

export default async function TacticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: positions } = await supabase
    .from('tactic_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <TacticsContent initialPositions={positions ?? []} />
}
