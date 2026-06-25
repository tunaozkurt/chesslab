import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { anthropic, AI_MODEL } from '@/lib/ai/client'

const PHASE_TR: Record<string, string> = {
  opening: 'Açılış', middlegame: 'Orta oyun', endgame: 'Oyun sonu',
}
const SEVERITY_TR: Record<string, string> = {
  blunder: 'Blunder (??)', mistake: 'Hata (?)', inaccuracy: 'Yanlışlık (?!)',
}
const RESULT_TR: Record<string, string> = {
  win: 'Kazandı', loss: 'Kaybetti', draw: 'Berabere',
}
const COLOR_TR: Record<string, string> = {
  white: 'Beyaz', black: 'Siyah',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId } = await request.json()
  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })

  const [{ data: game }, { data: mistakes }] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).eq('user_id', user.id).single(),
    supabase.from('mistakes').select('severity, game_phase, user_move, best_move, centipawn_loss').eq('game_id', gameId).order('centipawn_loss', { ascending: false }).limit(10),
  ])

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const mistakeLines = (mistakes ?? []).map((m, i) =>
    `${i + 1}. ${SEVERITY_TR[m.severity] ?? m.severity} — Faz: ${PHASE_TR[m.game_phase ?? ''] ?? '?'}, Oynanan: ${m.user_move}, Doğru: ${m.best_move ?? '?'}, CP Kaybı: ${m.centipawn_loss}`
  ).join('\n')

  const blunderCount = (mistakes ?? []).filter(m => m.severity === 'blunder').length
  const mistakeCount = (mistakes ?? []).filter(m => m.severity === 'mistake').length

  const prompt = `Sen bir satranç koçusun. Oyuncunun partisini analiz et ve Türkçe olarak yapıcı bir değerlendirme yaz.

Oyun bilgileri:
- Renk: ${COLOR_TR[game.user_color ?? ''] ?? game.user_color}
- Rakip: ${game.opponent ?? 'Bilinmiyor'}
- Sonuç: ${RESULT_TR[game.result ?? ''] ?? game.result ?? 'Bilinmiyor'}
- Toplam hamle: ${game.total_moves ?? '?'}
- Açılış: ${game.opening_name ?? game.eco_code ?? 'Bilinmiyor'}
- Blunder: ${blunderCount}, Hata: ${mistakeCount}

${mistakes && mistakes.length > 0 ? `Kritik hatalar (ağır olandan hafife):\n${mistakeLines}` : 'Analiz edilmiş hata bulunamadı.'}

Yukarıdaki verilere dayanarak 200-280 kelimelik Türkçe bir değerlendirme yaz. Şunları içermeli:
1. Oyunun genel değerlendirmesi
2. En kritik hata ve oyuncunun neden bu hatayı yaptığı olabilir
3. Bu oyundan çıkarılacak bir veya iki somut ders
4. Bir sonraki adım için pratik öneri

Tonu yapıcı ve teşvik edici tut.`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save to game notes or a separate field — store in games table if we have room
    // For now just return it
    return NextResponse.json({ summary })
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: 'API key geçersiz. .env.local dosyasında ANTHROPIC_API_KEY anahtarını kontrol et.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'AI analiz başarısız: ' + (err?.message ?? 'Bilinmeyen hata') }, { status: 500 })
  }
}
