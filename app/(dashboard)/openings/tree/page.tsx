import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OpeningTreeContent } from '@/components/openings/OpeningTreeContent'

export default async function OpeningTreePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lines } = await supabase
    .from('repertoire_lines')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <OpeningTreeContent initialLines={lines ?? []} />
}
