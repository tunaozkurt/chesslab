'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart3, Brain, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Game {
  id: string
  result: string | null
  user_color: string | null
  opening_name: string | null
  eco_code: string | null
  played_at: string | null
  analysis_status: string
}

interface Mistake {
  severity: string
  game_phase: string | null
  centipawn_loss: number | null
  game_id: string
  created_at: string
  mistake_themes?: { mistake_categories: { name: string; parent_category: string } | { name: string; parent_category: string }[] | null }[]
}

interface WeaknessScore {
  area: string
  score: number
}

interface Review {
  quality: number
  reviewed_at: string
  time_spent_seconds: number | null
}

interface Props {
  games: Game[]
  mistakes: Mistake[]
  weaknessScores: WeaknessScore[]
  reviews: Review[]
}

const WEAKNESS_LABEL: Record<string, string> = {
  tactical_awareness: 'Taktik',
  opening_confidence: 'Açılış',
  endgame_technique: 'Oyun Sonu',
  planning: 'Plan',
  calculation: 'Hesap',
  time_management: 'Zaman',
  advantage_conversion: 'Avantaj',
  defense: 'Savunma',
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-300">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#f59e0b' }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export function ReportsContent({ games, mistakes, weaknessScores, reviews }: Props) {
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  async function generateWeeklyReport() {
    setAiLoading(true)
    const res = await fetch('/api/ai/weekly-report', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setAiReport(data.report)
    } else {
      toast.error(data.error ?? 'AI rapor başarısız')
    }
    setAiLoading(false)
  }
  const wins = games.filter(g => g.result === 'win').length
  const losses = games.filter(g => g.result === 'loss').length
  const draws = games.filter(g => g.result === 'draw').length
  const total = games.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const blunders = mistakes.filter(m => m.severity === 'blunder').length
  const mistakeCount = mistakes.filter(m => m.severity === 'mistake').length
  const inaccuracies = mistakes.filter(m => m.severity === 'inaccuracy').length

  const avgCpLoss = mistakes.length
    ? Math.round(mistakes.reduce((s, m) => s + (m.centipawn_loss ?? 0), 0) / mistakes.length)
    : 0

  // CP loss per game trend
  const cpByGame: Record<string, number[]> = {}
  for (const m of mistakes) {
    if (!cpByGame[m.game_id]) cpByGame[m.game_id] = []
    if (m.centipawn_loss !== null) cpByGame[m.game_id].push(m.centipawn_loss)
  }
  const cpTrend = games
    .filter(g => g.analysis_status === 'completed' && cpByGame[g.id])
    .slice(-15)
    .map((g, i) => {
      const arr = cpByGame[g.id]
      const avg = arr?.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
      return {
        idx: i + 1,
        avgCp: avg,
        result: g.result,
        label: `vs ${g.played_at ? new Date(g.played_at).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }) : '?'}`,
        dot: g.result === 'win' ? '#22c55e' : g.result === 'loss' ? '#ef4444' : '#71717a',
      }
    })

  // Weekly games chart
  const weeklyData: Record<string, { wins: number; losses: number; draws: number }> = {}
  for (const g of games) {
    if (!g.played_at) continue
    const date = new Date(g.played_at)
    const weekKey = `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('tr-TR', { month: 'short' })}`
    if (!weeklyData[weekKey]) weeklyData[weekKey] = { wins: 0, losses: 0, draws: 0 }
    if (g.result === 'win') weeklyData[weekKey].wins++
    if (g.result === 'loss') weeklyData[weekKey].losses++
    if (g.result === 'draw') weeklyData[weekKey].draws++
  }
  const weeklyChart = Object.entries(weeklyData).map(([week, v]) => ({ week, ...v }))

  // Mistakes by phase
  const phaseData = [
    { phase: 'Açılış', count: mistakes.filter(m => m.game_phase === 'opening').length, fill: '#3b82f6' },
    { phase: 'Orta oyun', count: mistakes.filter(m => m.game_phase === 'middlegame').length, fill: '#f97316' },
    { phase: 'Oyun sonu', count: mistakes.filter(m => m.game_phase === 'endgame').length, fill: '#a855f7' },
  ]

  // Result pie
  const resultPie = [
    { name: 'Kazandı', value: wins, color: '#22c55e' },
    { name: 'Kaybetti', value: losses, color: '#ef4444' },
    { name: 'Berabere', value: draws, color: '#71717a' },
  ].filter(d => d.value > 0)

  // Opening stats with W/D/L breakdown
  const openingStats: Record<string, { wins: number; draws: number; losses: number; total: number }> = {}
  for (const g of games) {
    const key = g.opening_name ?? g.eco_code ?? 'Bilinmiyor'
    if (!openingStats[key]) openingStats[key] = { wins: 0, draws: 0, losses: 0, total: 0 }
    openingStats[key].total++
    if (g.result === 'win') openingStats[key].wins++
    if (g.result === 'draw') openingStats[key].draws++
    if (g.result === 'loss') openingStats[key].losses++
  }
  const topOpenings = Object.entries(openingStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)

  // Theme frequency
  const themeFreq: Record<string, number> = {}
  for (const m of mistakes) {
    for (const t of m.mistake_themes ?? []) {
      const cat = Array.isArray(t.mistake_categories) ? t.mistake_categories[0] : t.mistake_categories
      if (cat?.name) themeFreq[cat.name] = (themeFreq[cat.name] ?? 0) + 1
    }
  }
  const themeChart = Object.entries(themeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  // Review stats
  const avgQuality = reviews.length
    ? (reviews.reduce((s, r) => s + r.quality, 0) / reviews.length).toFixed(1)
    : '—'
  const reviewsThisWeek = reviews.filter(r => {
    const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay())
    return new Date(r.reviewed_at) >= ws
  }).length

  // Daily reviews
  const dailyReviews: Record<string, number> = {}
  for (const r of reviews) {
    const day = r.reviewed_at.slice(0, 10)
    dailyReviews[day] = (dailyReviews[day] ?? 0) + 1
  }
  const reviewChart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().slice(0, 10)
    return { day: key.slice(8), count: dailyReviews[key] ?? 0 }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Performans Raporları
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Son 30 günlük veriler</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Oyun', value: total, color: 'text-white' },
          { label: 'Kazanma %', value: `${winRate}%`, color: winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Hata + Blunder', value: blunders + mistakeCount, color: 'text-orange-400' },
          { label: 'Ort. CP Kayıp', value: avgCpLoss || '—', color: avgCpLoss < 50 ? 'text-emerald-400' : avgCpLoss < 80 ? 'text-amber-400' : 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Genel</TabsTrigger>
          <TabsTrigger value="mistakes" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Hatalar</TabsTrigger>
          <TabsTrigger value="openings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Açılışlar</TabsTrigger>
          <TabsTrigger value="study" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Çalışma</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 gap-1.5">
            <Sparkles className="w-3 h-3" />AI Koç
          </TabsTrigger>
        </TabsList>

        {/* Genel */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* CP trend */}
          {cpTrend.length >= 3 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Centipawn Kayıp Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={cpTrend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="idx" tick={{ fill: '#52525b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} domain={[0, 'dataMax + 15']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="avgCp"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props
                        return <circle key={payload.idx} cx={cx} cy={cy} r={4} fill={payload.dot} stroke="#18181b" strokeWidth={1.5} />
                      }}
                      connectNulls={false}
                      name="CP Kayıp"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Result pie */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Sonuç Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {total === 0 ? <p className="text-zinc-500 text-sm text-center py-8">Oyun yok</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={resultPie} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                        {resultPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
                      <Legend formatter={(v) => <span className="text-zinc-300 text-xs">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Weakness scores */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Zayıflık Haritası
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weaknessScores.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Oyunları analiz et</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weaknessScores.map(w => ({ name: WEAKNESS_LABEL[w.area] ?? w.area, score: w.score }))}>
                      <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="score" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Skor" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Weekly trend */}
          {weeklyChart.length > 1 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Haftalık Oyun Trendi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weeklyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="wins" fill="#22c55e" radius={[2, 2, 0, 0]} name="Kazandı" stackId="a" />
                    <Bar dataKey="draws" fill="#71717a" radius={[0, 0, 0, 0]} name="Berabere" stackId="a" />
                    <Bar dataKey="losses" fill="#ef4444" radius={[2, 2, 0, 0]} name="Kaybetti" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hatalar */}
        <TabsContent value="mistakes" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Faza Göre Hatalar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={phaseData}>
                    <XAxis dataKey="phase" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {phaseData.map((entry) => (
                      <Bar key={entry.phase} dataKey="count" fill={entry.fill} radius={[4, 4, 0, 0]} name="Hata" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Hata Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-4">
                  {[
                    { label: 'Blunder ??', count: blunders, color: 'bg-red-500' },
                    { label: 'Hata ?', count: mistakeCount, color: 'bg-orange-500' },
                    { label: 'Yanlışlık ?!', count: inaccuracies, color: 'bg-yellow-500' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-300 text-sm">{s.label}</span>
                        <span className="text-zinc-400 text-sm font-mono">{s.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {mistakes.length > 0 && (
                          <div className={cn('h-full rounded-full', s.color)}
                            style={{ width: `${(s.count / mistakes.length) * 100}%` }} />
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Toplam hata</span>
                      <span>{mistakes.length}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>Ortalama CP kayıp</span>
                      <span className={avgCpLoss < 50 ? 'text-emerald-400' : avgCpLoss < 80 ? 'text-amber-400' : 'text-red-400'}>{avgCpLoss}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {themeChart.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm">En Sık Hata Temaları</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={themeChart} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={150} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} name="Adet" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Açılışlar */}
        <TabsContent value="openings" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Açılış Performansı</CardTitle>
            </CardHeader>
            <CardContent>
              {topOpenings.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Yeterli veri yok</p>
              ) : (
                <div className="space-y-3">
                  {topOpenings.map(([name, stats]) => {
                    const wr = Math.round((stats.wins / stats.total) * 100)
                    const dr = Math.round((stats.draws / stats.total) * 100)
                    const lr = 100 - wr - dr
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-zinc-200 text-sm truncate flex-1 mr-3">{name}</p>
                          <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                            <span className="text-emerald-400 font-mono">{stats.wins}K</span>
                            <span className="text-zinc-500 font-mono">{stats.draws}B</span>
                            <span className="text-red-400 font-mono">{stats.losses}M</span>
                            <span className="text-zinc-600">({stats.total})</span>
                          </div>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                          {wr > 0 && <div className="bg-emerald-500" style={{ width: `${wr}%` }} />}
                          {dr > 0 && <div className="bg-zinc-500" style={{ width: `${dr}%` }} />}
                          {lr > 0 && <div className="bg-red-500" style={{ width: `${lr}%` }} />}
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex gap-4 pt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-sm" />Kazandı</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-zinc-500 rounded-sm" />Berabere</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-sm" />Kaybetti</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Çalışma */}
        <TabsContent value="study" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Tekrar', value: reviews.length, color: 'text-amber-400' },
              { label: 'Bu Hafta', value: reviewsThisWeek, color: 'text-blue-400' },
              { label: 'Ort. Kalite', value: `${avgQuality}/5`, color: 'text-emerald-400' },
              { label: 'Ort. Süre', value: reviews.filter(r => r.time_spent_seconds).length > 0 ? `${Math.round(reviews.filter(r => r.time_spent_seconds).reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0) / reviews.filter(r => r.time_spent_seconds).length)}s` : '—', color: 'text-purple-400' },
            ].map(s => (
              <Card key={s.label} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 text-center">
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {reviewChart.some(r => r.count > 0) && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Son 14 Gün Aktivite</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={reviewChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: '#52525b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Tekrar" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {reviews.length === 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-12 text-center">
                <p className="text-zinc-500">Henüz çalışma kaydı yok.</p>
                <p className="text-zinc-600 text-sm mt-1">Çalışma planından oturum başlat.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Coach */}
        <TabsContent value="ai" className="mt-4 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Haftalık AI Koç Raporu
                </CardTitle>
                {!aiReport && (
                  <Button
                    onClick={generateWeeklyReport}
                    disabled={aiLoading || total === 0}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm gap-2"
                  >
                    {aiLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Oluşturuluyor...</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Rapor Oluştur</>}
                  </Button>
                )}
                {aiReport && (
                  <button onClick={() => setAiReport(null)} className="text-zinc-500 hover:text-zinc-300 text-xs">
                    Yenile
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {total === 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-500 text-sm">AI raporu için en az 1 oyun gerekli.</p>
                  <p className="text-zinc-600 text-xs mt-1">Oyun yükleyip analiz ettikten sonra dene.</p>
                </div>
              )}
              {aiLoading && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  <p className="text-zinc-400">Claude son 30 günü analiz ediyor...</p>
                </div>
              )}
              {aiReport && !aiLoading && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5">
                  <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">{aiReport}</p>
                </div>
              )}
              {!aiReport && !aiLoading && total > 0 && (
                <div className="text-center py-8 space-y-2">
                  <div className="text-4xl">🤖</div>
                  <p className="text-zinc-400 text-sm">Claude, son 30 günlük oyunları ve hatalarını analiz edip</p>
                  <p className="text-zinc-400 text-sm">Türkçe kişisel gelişim raporu oluşturacak.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
