'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { CalendarCheck, Star, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewWithItem {
  id: string
  quality: number
  reviewed_at: string
  time_spent_seconds: number | null
  study_items: {
    title: string
    type: string
  } | null
}

interface Props {
  reviews: ReviewWithItem[]
}

const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: 'Mükemmel', color: '#22c55e' },
  4: { label: 'İyi', color: '#84cc16' },
  3: { label: 'Zorlandım', color: '#eab308' },
  2: { label: 'Zor', color: '#f97316' },
  1: { label: 'Başarısız', color: '#ef4444' },
  0: { label: 'Unuttum', color: '#7f1d1d' },
}

const TYPE_ICONS: Record<string, string> = {
  mistake: '⚠️', repertoire: '📖', endgame: '♚', tactic: '⚔️', concept: '💡',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-300">
      <p className="font-medium mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#f59e0b' }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export function ReviewsContent({ reviews }: Props) {
  const total = reviews.length
  const avgQuality = total > 0
    ? (reviews.reduce((s, r) => s + r.quality, 0) / total).toFixed(1)
    : null
  const avgTime = reviews.filter(r => r.time_spent_seconds).length > 0
    ? Math.round(reviews.filter(r => r.time_spent_seconds).reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0) / reviews.filter(r => r.time_spent_seconds).length)
    : null

  // Reviews per day (last 30 days)
  const dailyCounts: Record<string, number> = {}
  for (const r of reviews) {
    const day = r.reviewed_at.slice(0, 10)
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1
  }
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { day: key.slice(5), count: dailyCounts[key] ?? 0 }
  })

  // Quality distribution
  const qualityDist = [0, 1, 2, 3, 4, 5].map(q => ({
    label: QUALITY_LABELS[q].label,
    count: reviews.filter(r => r.quality === q).length,
    color: QUALITY_LABELS[q].color,
  })).filter(d => d.count > 0)

  // This week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const thisWeek = reviews.filter(r => new Date(r.reviewed_at) >= weekStart).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-amber-400" />
          Tekrar Geçmişi
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Son 30 günlük çalışma kayıtları</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Tekrar', value: total, icon: <CalendarCheck className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
          { label: 'Bu Hafta', value: thisWeek, icon: <TrendingUp className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
          { label: 'Ort. Kalite', value: avgQuality ? `${avgQuality}/5` : '—', icon: <Star className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Ort. Süre', value: avgTime ? `${avgTime}s` : '—', icon: <Clock className="w-4 h-4 text-purple-400" />, color: 'text-purple-400' },
        ].map(s => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-zinc-500 text-xs">{s.label}</p></div>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily activity */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Günlük Aktivite (Son 30 Gün)</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Henüz tekrar yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={last30} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: '#52525b', fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fill: '#52525b', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Tekrar" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quality distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Kalite Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {qualityDist.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Veri yok</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={qualityDist} cx="50%" cy="50%" outerRadius={60} dataKey="count">
                      {qualityDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {qualityDist.map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-zinc-300 text-xs flex-1">{d.label}</span>
                      <span className="text-zinc-500 text-xs">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent reviews list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm">Son Tekrarlar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-zinc-400">Henüz çalışma kaydı yok.</p>
              <p className="text-zinc-600 text-sm mt-1">Çalışma planından oturum başlat.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {reviews.slice(0, 30).map((r) => {
                const q = QUALITY_LABELS[r.quality] ?? QUALITY_LABELS[3]
                const itemType = r.study_items?.type ?? ''
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors">
                    <span className="text-base flex-shrink-0">{TYPE_ICONS[itemType] ?? '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm truncate">{r.study_items?.title ?? '—'}</p>
                      <p className="text-zinc-600 text-xs">
                        {new Date(r.reviewed_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {r.time_spent_seconds && <span className="ml-2">{r.time_spent_seconds}s</span>}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: q.color, backgroundColor: q.color + '22' }}>
                      {q.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
