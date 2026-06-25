import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MistakesContent } from '@/components/mistakes/MistakesContent'

export default async function MistakesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: mistakes },
    { data: categories },
    { data: weaknessScores },
  ] = await Promise.all([
    supabase
      .from('mistakes')
      .select(`
        *,
        games(opponent, played_at, user_color, result),
        mistake_themes(category_id, mistake_categories(id, name, parent_category))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('mistake_categories')
      .select('*')
      .order('parent_category')
      .order('sort_order'),
    supabase
      .from('weakness_scores')
      .select('*')
      .eq('user_id', user.id),
  ])

  return (
    <MistakesContent
      mistakes={mistakes ?? []}
      categories={categories ?? []}
      weaknessScores={weaknessScores ?? []}
    />
  )
}
