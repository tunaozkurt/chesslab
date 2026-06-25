'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MistakeThemeTagger } from './MistakeThemeTagger'
import { cn } from '@/lib/utils'
import { AlertTriangle, Brain, Filter, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  parent_category: string
  sort_order: number
}

interface MistakeRow {
  id: string
  game_id: string
  fen: string
  user_move: string
  best_move: string | null
  centipawn_loss: number | null
  severity: string
  game_phase: string | null
  notes: string | null
  is_reviewed: boolean
  created_at: string
  games?: { opponent: string | null; played_at: string | null; user_color: string | null; result: string | null }
  mistake_themes?: { category_id: string; mistake_categories: Category }[]
}

interface WeaknessScore {
  area: string
  score: number
  computed_at: string
}

interface Props {
  mistakes: MistakeRow[]
  categories: Category[]
  weaknessScores: WeaknessScore[]
}

const SEVERITY_CONFIG = {
  blunder: { label: 'Blunder ??', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  mistake: { label: 'Hata ?', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  inaccuracy: { label: 'Yanlışlık ?!', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
}

const PHASE_LABEL: Record<string, string> = {
  opening: 'Açılış',
  middlegame: 'Orta oyun',
  endgame: 'Oyun sonu',
}

const PARENT_LABEL: Record<string, string> = {
  opening: 'Açılış Hataları',
  tactical: 'Taktik Hatalar',
  strategic: 'Stratejik Hatalar',
  endgame: 'Oyun Sonu Hataları',
  time_psychology: 'Zaman & Psikoloji',
}

const WEAKNESS_LABEL: Record<string, string> = {
  tactical_awareness: 'Taktik Farkındalık',
  opening_confidence: 'Açılış Güveni',
  endgame_technique: 'Oyun Sonu Tekniği',
  planning: 'Plan Kurma',
  calculation: 'Hesap Yapma',
  time_management: 'Zaman Yönetimi',
  advantage_conversion: 'Avantajı Koruma',
  defense: 'Savunma',
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}
function getBarColor(score: number) {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export function MistakesContent({ mistakes, categories, weaknessScores }: Props) {
  const [filter, setFilter] = useState<'all' | 'blunder' | 'mistake' | 'inaccuracy'>('all')
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'opening' | 'middlegame' | 'endgame'>('all')
  const [selectedMistake, setSelectedMistake] = useState<MistakeRow | null>(null)
  const [localMistakes, setLocalMistakes] = useState(mistakes)

  const filtered = localMistakes.filter(m => {
    if (filter !== 'all' && m.severity !== filter) return false
    if (phaseFilter !== 'all' && m.game_phase !== phaseFilter) return false
    return true
  })

  const blunders = localMistakes.filter(m => m.severity === 'blunder').length
  const mistakeCount = localMistakes.filter(m => m.severity === 'mistake').length
  const inaccuracies = localMistakes.filter(m => m.severity === 'inaccuracy').length

  // Theme frequency
  const themeFreq: Record<string, number> = {}
  for (const m of localMistakes) {
    for (const t of m.mistake_themes ?? []) {
      const name = t.mistake_categories?.name
      if (name) themeFreq[name] = (themeFreq[name] ?? 0) + 1
    }
  }
  const topThemes = Object.entries(themeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  function handleTagged(mistakeId: string, categoryIds: string[]) {
    setLocalMistakes(prev => prev.map(m => {
      if (m.id !== mistakeId) return m
      const newThemes = categoryIds.map(cid => {
        const cat = categories.find(c => c.id === cid)!
        return { category_id: cid, mistake_categories: cat }
      })
      return { ...m, is_reviewed: true, mistake_themes: newThemes }
    }))
    setSelectedMistake(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          Hata Haritam
        </h1>
        <p className="text-zinc-400 text-sm mt-1">{localMistakes.length} toplam hata · {localMistakes.filter(m => !m.is_reviewed).length} incelenmemiş</p>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="list" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Hata Listesi</TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Zayıflık Haritası</TabsTrigger>
          <TabsTrigger value="themes" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400">Tema Analizi</TabsTrigger>
        </TabsList>

        {/* TAB 1: Hata Listesi */}
        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Blunder ??', count: blunders, color: 'text-red-400', key: 'blunder' },
              { label: 'Hata ?', count: mistakeCount, color: 'text-orange-400', key: 'mistake' },
              { label: 'Yanlışlık ?!', count: inaccuracies, color: 'text-yellow-400', key: 'inaccuracy' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setFilter(filter === s.key as typeof filter ? 'all' : s.key as typeof filter)}
                className={cn(
                  'bg-zinc-900 border rounded-xl p-3 text-center transition-colors',
                  filter === s.key ? 'border-amber-500/50' : 'border-zinc-800 hover:border-zinc-700'
                )}
              >
                <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Phase filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            {(['all', 'opening', 'middlegame', 'endgame'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPhaseFilter(p)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  phaseFilter === p
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {p === 'all' ? 'Tümü' : PHASE_LABEL[p]}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500">Bu filtreler için hata bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(m => {
                const cfg = SEVERITY_CONFIG[m.severity as keyof typeof SEVERITY_CONFIG]
                return (
                  <div
                    key={m.id}
                    className={cn('rounded-xl border p-4 flex items-start gap-4', cfg?.bg ?? 'bg-zinc-900 border-zinc-800')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-bold', cfg?.color)}>{cfg?.label}</span>
                        <span className="text-white font-mono text-sm">{m.user_move}</span>
                        {m.best_move && (
                          <span className="text-zinc-500 text-xs">→ En iyi: <span className="text-blue-400 font-mono">{m.best_move}</span></span>
                        )}
                        {m.centipawn_loss !== null && (
                          <span className="text-zinc-600 text-xs">−{m.centipawn_loss} cp</span>
                        )}
                        {m.game_phase && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                            {PHASE_LABEL[m.game_phase]}
                          </Badge>
                        )}
                        {!m.is_reviewed && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-xs">incelenmemiş</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-zinc-600 text-xs">
                          vs {m.games?.opponent ?? '?'} ·{' '}
                          {m.games?.played_at ? new Date(m.games.played_at).toLocaleDateString('tr-TR') : ''}
                        </span>
                      </div>
                      {/* Tags */}
                      {m.mistake_themes && m.mistake_themes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {m.mistake_themes.map(t => (
                            <span key={t.category_id} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                              {t.mistake_categories?.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/games/${m.game_id}`}>
                        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs">
                          Oyun
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMistake(m)}
                        className="border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/50 text-xs"
                      >
                        Etiketle
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Zayıflık Haritası */}
        <TabsContent value="map" className="mt-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Zayıflık Skorları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weaknessScores.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">
                  Henüz skor hesaplanmadı. Oyunları analiz et.
                </p>
              ) : (
                Object.entries(WEAKNESS_LABEL).map(([key, label]) => {
                  const ws = weaknessScores.find(w => w.area === key)
                  const score = ws?.score ?? null
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-zinc-200 text-sm">{label}</span>
                        {score !== null ? (
                          <span className={cn('text-sm font-bold', getScoreColor(score))}>{score}/100</span>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {score !== null && (
                          <div
                            className={cn('h-full rounded-full transition-all', getBarColor(score))}
                            style={{ width: `${score}%` }}
                          />
                        )}
                      </div>
                      {score !== null && score < 50 && (
                        <p className="text-red-400/70 text-xs mt-0.5">Öncelikli çalışma alanı</p>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Tema Analizi */}
        <TabsContent value="themes" className="mt-4 space-y-4">
          {topThemes.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500">Henüz etiketlenmiş hata yok.</p>
              <p className="text-zinc-600 text-sm mt-1">Hataları etiketledikçe tema analizi burada görünür.</p>
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-base">En Sık Hata Temaları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topThemes.map(([theme, count]) => {
                  const maxCount = topThemes[0][1]
                  return (
                    <div key={theme}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-sm">{theme}</span>
                        <span className="text-zinc-500 text-sm">{count}x</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/70 rounded-full"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* By parent category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PARENT_LABEL).map(([parent, label]) => {
              const parentCats = categories.filter(c => c.parent_category === parent)
              const parentCount = localMistakes.reduce((sum, m) => {
                const tagged = m.mistake_themes?.some(t => t.mistake_categories?.parent_category === parent)
                return sum + (tagged ? 1 : 0)
              }, 0)
              return (
                <Card key={parent} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-sm">{label}</CardTitle>
                      <span className="text-zinc-500 text-xs">{parentCount} hata</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {parentCats.map(cat => {
                        const count = themeFreq[cat.name] ?? 0
                        return (
                          <span
                            key={cat.id}
                            className={cn(
                              'text-xs px-2 py-1 rounded-full border',
                              count > 0
                                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                                : 'border-zinc-800 text-zinc-600'
                            )}
                          >
                            {cat.name} {count > 0 && `(${count})`}
                          </span>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Theme Tagger Modal */}
      {selectedMistake && (
        <MistakeThemeTagger
          mistake={selectedMistake}
          categories={categories}
          onSave={(categoryIds) => handleTagged(selectedMistake.id, categoryIds)}
          onClose={() => setSelectedMistake(null)}
        />
      )}
    </div>
  )
}
