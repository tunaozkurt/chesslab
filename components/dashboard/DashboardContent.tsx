'use client'

import Link from 'next/link'
import { Game, StudyItem, WeaknessScore } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Trophy, TrendingUp, AlertTriangle, BookOpen,
  CalendarCheck, Clock, ChevronRight, Upload, Brain, Activity,
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/chess/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface Props {
  recentGames: Game[]
  studyItemsDue: StudyItem[]
  weaknessScores: WeaknessScore[]
  pendingAnalysis: number
  gameMistakes: { game_id: string; centipawn_loss: number | null }[]
}

const WEAKNESS_AREAS = [
  { key: 'tactical_awareness', label: 'Taktik Farkındalık' },
  { key: 'opening_confidence', label: 'Açılış Güveni' },
  { key: 'endgame_technique', label: 'Oyun Sonu Tekniği' },
  { key: 'planning', label: 'Plan Kurma' },
  { key: 'time_management', label: 'Zaman Yönetimi' },
  { key: 'advantage_conversion', label: 'Avantajı Koruma' },
  { key: 'defense', label: 'Savunma Becerisi' },
  { key: 'calculation', label: 'Hesap Yapma' },
]

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBarColor(score: number) {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null
  const map = {
    win: { label: 'Kazandı', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    loss: { label: 'Kaybetti', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    draw: { label: 'Berabere', cls: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  }
  const cfg = map[result as keyof typeof map]
  if (!cfg) return null
  return <span className={`text-xs px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
}

function StudyTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    mistake: '⚠️', repertoire: '📖', endgame: '♚', tactic: '⚔️', concept: '💡',
  }
  return <span>{icons[type] ?? '📋'}</span>
}

const RESULT_DOT: Record<string, string> = {
  win: '#22c55e', loss: '#ef4444', draw: '#71717a',
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs">
      <p className="text-zinc-200 font-medium mb-1">{d?.label}</p>
      {d?.avgCp !== null && d?.avgCp !== undefined && (
        <p className="text-zinc-400">Ort. CP Kayıp: <span className="text-amber-400 font-bold">{d.avgCp}</span></p>
      )}
      <p className="text-zinc-500 mt-0.5">{d?.result === 'win' ? '✓ Kazandı' : d?.result === 'loss' ? '✗ Kaybetti' : '= Berabere'}</p>
    </div>
  )
}

export function DashboardContent({ recentGames, studyItemsDue, weaknessScores, pendingAnalysis, gameMistakes }: Props) {
  const wins = recentGames.filter(g => g.result === 'win').length
  const losses = recentGames.filter(g => g.result === 'loss').length
  const draws = recentGames.filter(g => g.result === 'draw').length
  const total = recentGames.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const scoreMap = Object.fromEntries(weaknessScores.map(s => [s.area, s.score]))

  // CP loss per game
  const cpByGame: Record<string, number[]> = {}
  for (const m of gameMistakes) {
    if (m.centipawn_loss === null) continue
    if (!cpByGame[m.game_id]) cpByGame[m.game_id] = []
    cpByGame[m.game_id].push(m.centipawn_loss)
  }

  const trendData = [...recentGames].reverse().slice(-10).map((g, i) => {
    const arr = cpByGame[g.id]
    const avgCp = arr?.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
    return {
      idx: i + 1,
      avgCp,
      result: g.result,
      label: `vs ${g.opponent ?? '?'}`,
      dot: RESULT_DOT[g.result ?? ''] ?? '#71717a',
    }
  })

  const analyzedCount = trendData.filter(d => d.avgCp !== null).length
  const overallAvgCp = analyzedCount > 0
    ? Math.round(trendData.filter(d => d.avgCp !== null).reduce((s, d) => s + d.avgCp!, 0) / analyzedCount)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/games/upload">
          <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Upload className="w-4 h-4" />
            PGN Yükle
          </Button>
        </Link>
      </div>

      {/* Pending Analysis Alert */}
      {pendingAnalysis > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-semibold">{pendingAnalysis} oyun</span> analiz bekliyor.
          </p>
          <Link href="/games" className="ml-auto">
            <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
              Görüntüle
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-zinc-500 text-xs">Son Oyunlar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{winRate}%</p>
                <p className="text-zinc-500 text-xs">Kazanma Oranı</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{studyItemsDue.length}</p>
                <p className="text-zinc-500 text-xs">Çalışma Bekliyor</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${overallAvgCp === null ? 'text-zinc-600' : overallAvgCp < 50 ? 'text-emerald-400' : overallAvgCp < 80 ? 'text-amber-400' : 'text-red-400'}`}>
                  {overallAvgCp !== null ? overallAvgCp : '—'}
                </p>
                <p className="text-zinc-500 text-xs">Ort. CP Kayıp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      {trendData.length >= 3 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Performans Trendi
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />K</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />M</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />B</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="idx" tick={{ fill: '#52525b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#52525b', fontSize: 10 }} domain={[0, 'dataMax + 20']} />
                <Tooltip content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="avgCp"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        key={payload.idx}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={payload.dot}
                        stroke="#18181b"
                        strokeWidth={1.5}
                      />
                    )
                  }}
                  connectNulls={false}
                  name="CP Kayıp"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-zinc-600 text-xs mt-1 text-center">Düşük CP kayıp = daha iyi oynama</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Study Queue */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-400" />
                  Bugünkü Çalışma
                </CardTitle>
                <Link href="/study" className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1">
                  Tümü <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {studyItemsDue.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-zinc-400 text-sm">Bugünlük çalışma kuyruğun boş!</p>
                  <p className="text-zinc-600 text-xs mt-1">Yeni oyun yükle veya pozisyon ekle.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {studyItemsDue.map((item, idx) => (
                    <li key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                      <span className="text-zinc-500 text-xs w-5 text-center">{idx + 1}.</span>
                      <StudyTypeIcon type={item.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-zinc-500 text-xs truncate">{item.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs flex-shrink-0">
                        {item.type}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {studyItemsDue.length > 0 && (
                <Link href="/study">
                  <Button className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                    Çalışmaya Başla
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Son Oyunlar
                </CardTitle>
                <Link href="/games" className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1">
                  Tümü <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentGames.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">♟️</div>
                  <p className="text-zinc-400 text-sm">Henüz oyun yüklemedin.</p>
                  <Link href="/games/upload" className="mt-3 inline-block">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                      İlk Oyunu Yükle
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-1">
                  {recentGames.slice(0, 8).map((game) => {
                    const arr = cpByGame[game.id]
                    const avgCp = arr?.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
                    return (
                      <li key={game.id}>
                        <Link
                          href={`/games/${game.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800 transition-colors group"
                        >
                          <span className="text-lg">{game.user_color === 'white' ? '♔' : '♚'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">vs {game.opponent ?? 'Bilinmiyor'}</p>
                            <p className="text-zinc-500 text-xs truncate">
                              {game.opening_name ?? game.eco_code ?? 'Açılış bilinmiyor'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {avgCp !== null && (
                              <span className={`text-xs font-mono ${avgCp < 50 ? 'text-emerald-400' : avgCp < 80 ? 'text-amber-400' : 'text-red-400'}`}>
                                {avgCp}cp
                              </span>
                            )}
                            <ResultBadge result={game.result} />
                            {game.analysis_status === 'pending' && (
                              <span className="text-xs text-zinc-600">analiz bekleniyor</span>
                            )}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weakness Map */}
        <div>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Zayıflık Haritam
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {WEAKNESS_AREAS.map((area) => {
                const score = scoreMap[area.key] ?? null
                return (
                  <div key={area.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-300 text-xs">{area.label}</span>
                      {score !== null ? (
                        <span className={`text-xs font-semibold ${getScoreColor(score)}`}>
                          {score}/100
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${score !== null ? getScoreBarColor(score) : ''}`}
                        style={{ width: score !== null ? `${score}%` : '0%' }}
                      />
                    </div>
                  </div>
                )
              })}
              {weaknessScores.length === 0 && (
                <p className="text-zinc-600 text-xs text-center py-4">
                  Oyun analizi tamamlandıkça skorlar hesaplanacak.
                </p>
              )}
              <Link href="/reports">
                <Button variant="outline" size="sm" className="w-full mt-2 border-zinc-700 text-zinc-400 hover:text-white text-xs">
                  Tüm Raporu Gör
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
