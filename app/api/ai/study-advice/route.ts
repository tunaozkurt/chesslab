import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { anthropic, AI_MODEL } from '@/lib/ai/client'

const WEAKNESS_TR: Record<string, string> = {
  tactical_awareness: 'Taktik Farkındalık',
  opening_confidence: 'Açılış Güveni',
  endgame_technique: 'Oyun Sonu Tekniği',
  planning: 'Plan Kurma',
  calculation: 'Hesap Yapma',
  time_management: 'Zaman Yönetimi',
  advantage_conversion: 'Avantajı Koruma',
  defense: 'Savunma',
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: weaknessScores }, { data: dueItems }, { data: recentMistakes }] = await Promise.all([
    supabase.from('weakness_scores').select('area, score').eq('user_id', user.id).order('score', { ascending: true }).limit(5),
    supabase.from('study_items').select('type, title').eq('user_id', user.id).eq('is_completed', false).lte('due_at', new Date().toISOString()).limit(20),
    supabase.from('mistakes').select('severity, game_phase').eq('user_id', user.id).gte('created_at', sevenDaysAgo).limit(20),
  ])

  const weakestArea = weaknessScores?.[0]
  const dueCount = dueItems?.length ?? 0
  const mistakeByPhase = {
    opening: recentMistakes?.filter(m => m.game_phase === 'opening').length ?? 0,
    middlegame: recentMistakes?.filter(m => m.game_phase === 'middlegame').length ?? 0,
    endgame: recentMistakes?.filter(m => m.game_phase === 'endgame').length ?? 0,
  }
  const worstPhase = Object.entries(mistakeByPhase).sort((a, b) => b[1] - a[1])[0]

  const prompt = `Sen bir satranç koçusun. Öğrenciye bu gün için kısa, odaklı çalışma tavsiyesi ver.

Veriler:
- En zayıf alan: ${weakestArea ? `${WEAKNESS_TR[weakestArea.area] ?? weakestArea.area} (${weakestArea.score}/100)` : 'Veri yok'}
- Çalışma kuyruğunda bekleyen: ${dueCount} öğe
- Son hafta en çok hata yapılan faz: ${worstPhase ? `${worstPhase[0]} (${worstPhase[1]} hata)` : 'Veri yok'}

Günlük çalışma tavsiyesi olarak 3 madde halinde kısa Türkçe öneri ver. Her madde 1-2 cümle. Tüm yanıt 100 kelimeyi geçmesin.`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    })

    const advice = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ advice })
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: 'API key geçersiz' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Hata: ' + (err?.message ?? 'Bilinmeyen') }, { status: 500 })
  }
}
