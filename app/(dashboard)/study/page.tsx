import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudyQueueContent } from '@/components/study/StudyQueueContent'
import type { StudyItemContext } from '@/components/study/types'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const [
    { data: dueItems },
    { data: upcomingItems },
    { count: totalItems },
  ] = await Promise.all([
    supabase
      .from('study_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .lte('due_at', now)
      .order('priority_score', { ascending: false })
      .limit(50),
    supabase
      .from('study_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .gt('due_at', now)
      .order('due_at', { ascending: true })
      .limit(20),
    supabase
      .from('study_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_completed', false),
  ])

  const items = dueItems ?? []

  const mistakeIds = items.filter(i => i.reference_table === 'mistakes' && i.reference_id).map(i => i.reference_id!)
  const endgameIds = items.filter(i => i.reference_table === 'endgame_positions' && i.reference_id).map(i => i.reference_id!)
  const tacticIds = items.filter(i => i.reference_table === 'tactic_positions' && i.reference_id).map(i => i.reference_id!)
  const repertoireIds = items.filter(i => i.reference_table === 'repertoire_lines' && i.reference_id).map(i => i.reference_id!)

  const [
    { data: mistakeData },
    { data: endgameData },
    { data: tacticData },
    { data: repertoireData },
  ] = await Promise.all([
    mistakeIds.length > 0
      ? supabase.from('mistakes').select('id, fen, user_move, best_move, centipawn_loss, game_phase, notes').in('id', mistakeIds)
      : { data: [] as any[] },
    endgameIds.length > 0
      ? supabase.from('endgame_positions').select('id, fen, theme, category, goal, notes').in('id', endgameIds)
      : { data: [] as any[] },
    tacticIds.length > 0
      ? supabase.from('tactic_positions').select('id, fen, motif, solution, notes').in('id', tacticIds)
      : { data: [] as any[] },
    repertoireIds.length > 0
      ? supabase.from('repertoire_lines').select('id, moves, main_idea, typical_plan, dangerous_ideas, notes').in('id', repertoireIds)
      : { data: [] as any[] },
  ])

  const contextMap: Record<string, StudyItemContext> = {}

  for (const m of mistakeData ?? []) {
    contextMap[m.id] = {
      fen: m.fen,
      userMove: m.user_move,
      bestMove: m.best_move,
      centipawnLoss: m.centipawn_loss,
      phase: m.game_phase,
      notes: m.notes,
    }
  }
  for (const e of endgameData ?? []) {
    contextMap[e.id] = {
      fen: e.fen,
      theme: e.theme,
      goal: e.goal,
      notes: e.notes,
    }
  }
  for (const t of tacticData ?? []) {
    contextMap[t.id] = {
      fen: t.fen,
      motif: t.motif,
      solution: t.solution,
      notes: t.notes,
    }
  }
  for (const r of repertoireData ?? []) {
    contextMap[r.id] = {
      moves: r.moves,
      mainIdea: r.main_idea,
      typicalPlan: r.typical_plan,
      dangerousIdeas: r.dangerous_ideas,
      notes: r.notes,
    }
  }

  return (
    <StudyQueueContent
      dueItems={items}
      upcomingItems={upcomingItems ?? []}
      totalPending={totalItems ?? 0}
      contextMap={contextMap}
    />
  )
}
