import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('tactic_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('tactic_positions')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('study_items').insert({
    user_id: user.id,
    type: 'tactic',
    reference_id: data.id,
    reference_table: 'tactic_positions',
    title: `Taktik: ${data.motif ?? 'Genel'}`,
    description: `Zorluk ${data.difficulty}/5${data.source === 'own_game' ? ' · Kendi oyunundan' : ''}`,
    priority_score: data.difficulty * 15,
    due_at: new Date().toISOString(),
  })

  return NextResponse.json(data)
}
