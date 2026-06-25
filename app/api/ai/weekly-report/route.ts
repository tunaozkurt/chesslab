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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: games },
    { data: mistakes },
    { data: weaknessScores },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('games').select('result').eq('user_id', user.id).gte('played_at', thirtyDaysAgo),
    supabase.from('mistakes').select('severity, game_phase, centipawn_loss, mistake_themes(mistake_categories(name))').eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
    supabase.from('weakness_scores').select('area, score').eq('user_id', user.id).order('score', { ascending: true }),
    supabase.from('reviews').select('quality').eq('user_id', user.id).gte('reviewed_at', thirtyDaysAgo),
  ])

  const total = games?.length ?? 0
  const wins = games?.filter(g => g.result === 'win').length ?? 0
  const losses = games?.filter(g => g.result === 'loss').length ?? 0
  const draws = games?.filter(g => g.result === 'draw').length ?? 0
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const blunders = mistakes?.filter(m => m.severity === 'blunder').length ?? 0
  const mistakeCount = mistakes?.filter(m => m.severity === 'mistake').length ?? 0
  const avgCp = mistakes?.length
    ? Math.round(mistakes.reduce((s, m) => s + (m.centipawn_loss ?? 0), 0) / mistakes.length)
    : 0

  // Top mistake themes
  const themeFreq: Record<string, number> = {}
  for (const m of mistakes ?? []) {
    for (const t of (m.mistake_themes as any[]) ?? []) {
      const cat = Array.isArray(t.mistake_categories) ? t.mistake_categories[0] : t.mistake_categories
      if (cat?.name) themeFreq[cat.name] = (themeFreq[cat.name] ?? 0) + 1
    }
  }
  const topThemes = Object.entries(themeFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => `${name} (${count} kez)`).join(', ')

  // Weakness scores
  const weaknessLines = (weaknessScores ?? []).slice(0, 5)
    .map(w => `${WEAKNESS_TR[w.area] ?? w.area}: ${w.score}/100`).join(', ')

  const avgQuality = reviews?.length
    ? (reviews.reduce((s, r) => s + r.quality, 0) / reviews.length).toFixed(1)
    : '—'

  if (total === 0) {
    return NextResponse.json({ report: 'Bu hafta yeterli veri yok. Oyun yükleyip analiz ettikten sonra tekrar deneyin.' })
  }

  const prompt = `Sen bir kişisel satranç koçusun. Öğrencinin son 30 günlük performansını değerlendir ve Türkçe olarak gelişim raporu yaz.

Performans özeti:
- Toplam oyun: ${total} (${wins}K / ${draws}B / ${losses}M, %${winRate} kazanma)
- Blunder: ${blunders}, Hata: ${mistakeCount}
- Ortalama centipawn kaybı: ${avgCp}
- Çalışma tekrarları: ${reviews?.length ?? 0} adet, ort. kalite: ${avgQuality}/5

${weaknessLines ? `Zayıf alanlar (düşükten yükseğe):\n${weaknessLines}` : ''}
${topThemes ? `En sık yapılan hata temaları:\n${topThemes}` : ''}

Bu verilerden yola çıkarak 220-280 kelimelik Türkçe haftalık rapor yaz. Rapor şunları içermeli:
1. Genel performans değerlendirmesi (dürüst ama yapıcı)
2. En acil iyileştirilmesi gereken 2 alan ve neden
3. Bu hafta odaklanılacak somut çalışma önerileri (örn. "X taktiği üzerine 15 dakika çalış")
4. Motive edici kapanış cümlesi

Öğrenciyi gerçekten anlayan ve yönlendiren bir koç gibi yaz.`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const report = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ report })
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: 'API key geçersiz. .env.local dosyasında ANTHROPIC_API_KEY ayarla.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'AI rapor başarısız: ' + (err?.message ?? 'Hata') }, { status: 500 })
  }
}
