import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('repertoire_lines')
    .select('*')
    .eq('user_id', user.id)
    .order('color')
    .order('name')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('repertoire_lines')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create study item for new repertoire line
  await supabase.from('study_items').insert({
    user_id: user.id,
    type: 'repertoire',
    reference_id: data.id,
    reference_table: 'repertoire_lines',
    title: `Açılış: ${data.name}`,
    description: data.main_idea ?? null,
    priority_score: 70,
    due_at: new Date().toISOString(),
  })

  return NextResponse.json(data)
}
