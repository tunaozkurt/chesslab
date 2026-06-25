import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsContent } from '@/components/reports/ReportsContent'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: games },
    { data: mistakes },
    { data: weaknessScores },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from('games')
      .select('id, result, user_color, opening_name, eco_code, played_at, analysis_status')
      .eq('user_id', user.id)
      .gte('played_at', thirtyDaysAgo)
      .order('played_at', { ascending: true }),
    supabase
      .from('mistakes')
      .select(`
        severity, game_phase, centipawn_loss, game_id, created_at,
        mistake_themes(mistake_categories(name, parent_category))
      `)
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('weakness_scores')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('reviews')
      .select('quality, reviewed_at, time_spent_seconds')
      .eq('user_id', user.id)
      .gte('reviewed_at', thirtyDaysAgo),
  ])

  return (
    <ReportsContent
      games={games ?? []}
      mistakes={mistakes ?? []}
      weaknessScores={weaknessScores ?? []}
      reviews={reviews ?? []}
    />
  )
}
