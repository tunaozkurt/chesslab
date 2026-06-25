import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Temel istatistikleri çek
  const [
    { data: recentGames },
    { data: studyItemsDue },
    { data: weaknessScores },
    { count: pendingAnalysis },
  ] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(10),
    supabase
      .from('study_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .lte('due_at', new Date().toISOString())
      .order('priority_score', { ascending: false })
      .limit(10),
    supabase
      .from('weakness_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('score', { ascending: true }),
    supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('analysis_status', 'pending'),
  ])

  const totalGames = recentGames?.length ?? 0

  return (
    <DashboardContent
      recentGames={recentGames ?? []}
      studyItemsDue={studyItemsDue ?? []}
      weaknessScores={weaknessScores ?? []}
      pendingAnalysis={pendingAnalysis ?? 0}
    />
  )
}
