import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsContent } from '@/components/reviews/ReviewsContent'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, quality, reviewed_at, time_spent_seconds, study_items(title, type)')
    .eq('user_id', user.id)
    .gte('reviewed_at', thirtyDaysAgo)
    .order('reviewed_at', { ascending: false })

  return <ReviewsContent reviews={(reviews as any) ?? []} />
}
