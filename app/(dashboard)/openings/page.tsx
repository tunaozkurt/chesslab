import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RepertoireContent } from '@/components/openings/RepertoireContent'

export default async function OpeningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lines } = await supabase
    .from('repertoire_lines')
    .select('*')
    .eq('user_id', user.id)
    .order('color')
    .order('name')

  return <RepertoireContent initialLines={lines ?? []} />
}
