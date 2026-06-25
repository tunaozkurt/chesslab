import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    display_name,
    rating,
    preferred_color,
    stockfish_depth,
    default_platform,
    lichess_username,
    chesscom_username,
  } = body

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      display_name: display_name || null,
      rating: rating || 1500,
      preferred_color: preferred_color || 'both',
      stockfish_depth: stockfish_depth || 20,
      default_platform: default_platform || 'chess.com',
      lichess_username: lichess_username || null,
      chesscom_username: chesscom_username || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
