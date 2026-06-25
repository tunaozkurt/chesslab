import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: gameId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  // study_items → mistakes FK değil, elle silmek gerekiyor
  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('id')
    .eq('game_id', gameId)

  if (mistakes && mistakes.length > 0) {
    await supabase
      .from('study_items')
      .delete()
      .eq('type', 'mistake')
      .in('reference_id', mistakes.map(m => m.id))
  }

  // moves, engine_analysis, mistakes → CASCADE ile silinir
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
