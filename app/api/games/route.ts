import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/games?platform=lichess → o platforma ait tüm oyunları sil
export async function DELETE(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'platform gerekli' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Önce o platformdaki oyunların ID'lerini al
  const { data: games } = await supabase
    .from('games')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', platform)

  if (!games || games.length === 0) return NextResponse.json({ deleted: 0 })

  const gameIds = games.map(g => g.id)

  // study_items için önce mistake ID'lerini bul
  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('id')
    .in('game_id', gameIds)

  if (mistakes && mistakes.length > 0) {
    await supabase
      .from('study_items')
      .delete()
      .eq('type', 'mistake')
      .in('reference_id', mistakes.map(m => m.id))
  }

  // Oyunları sil (moves, engine_analysis, mistakes CASCADE ile gider)
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: gameIds.length })
}
