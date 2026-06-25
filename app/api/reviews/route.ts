import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sm2, calculatePriorityScore } from '@/lib/algorithms/spaced-repetition'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studyItemId, quality, timeSpentSeconds }: {
    studyItemId: string
    quality: number   // 0-5 (SM-2)
    timeSpentSeconds?: number
  } = await req.json()

  // Fetch study item
  const { data: item } = await supabase
    .from('study_items').select('*').eq('id', studyItemId).eq('user_id', user.id).single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get last review for this item (to get current interval/ease)
  const { data: lastReviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('study_item_id', studyItemId)
    .order('reviewed_at', { ascending: false })
    .limit(1)

  const lastReview = lastReviews?.[0]
  const prevInterval = lastReview ? 1 : 1  // will be stored on the item itself ideally
  const prevEase = 2.5

  // SM-2
  const { interval, ease, nextReviewAt } = sm2(quality, prevInterval, prevEase)

  // Save review
  await supabase.from('reviews').insert({
    user_id: user.id,
    study_item_id: studyItemId,
    quality,
    time_spent_seconds: timeSpentSeconds ?? null,
    reviewed_at: new Date().toISOString(),
  })

  // Update study item
  const isSuccess = quality >= 3
  const newPriority = calculatePriorityScore({
    dueAt: nextReviewAt.toISOString(),
    isRepertoire: item.type === 'repertoire',
  })

  await supabase.from('study_items').update({
    due_at: nextReviewAt.toISOString(),
    priority_score: newPriority,
    is_completed: isSuccess && quality === 5,
  }).eq('id', studyItemId)

  return NextResponse.json({ interval, nextReviewAt, success: isSuccess })
}
