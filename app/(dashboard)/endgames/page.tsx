import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EndgameContent } from '@/components/endgames/EndgameContent'

export default async function EndgamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: positions } = await supabase
    .from('endgame_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <EndgameContent initialPositions={positions ?? []} />
}
