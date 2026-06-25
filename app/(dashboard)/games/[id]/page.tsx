import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GameViewer } from '@/components/games/GameViewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GamePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: game },
    { data: moves },
    { data: engineAnalysis },
    { data: mistakes },
  ] = await Promise.all([
    supabase.from('games').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('moves').select('*').eq('game_id', id).order('move_number').order('color'),
    supabase.from('engine_analysis').select('*').eq('game_id', id),
    supabase.from('mistakes').select(`*, mistake_themes(category_id, mistake_categories(*))`).eq('game_id', id),
  ])

  if (!game) notFound()

  return (
    <GameViewer
      game={game}
      moves={moves ?? []}
      engineAnalysis={engineAnalysis ?? []}
      mistakes={mistakes ?? []}
    />
  )
}
