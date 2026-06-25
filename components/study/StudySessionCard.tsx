'use client'

import { useState } from 'react'
import { Chess } from 'chess.js'
import { StudyItem } from '@/types'
import type { StudyItemContext } from './types'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  item: StudyItem
  context?: StudyItemContext
  onNext: () => void
  onPrev: () => void
  onReviewed: (itemId: string) => void
  onFinish: () => void
  isFirst: boolean
  isLast: boolean
}

const QUALITY_CONFIG = [
  { value: 5, label: 'Mükemmel', desc: 'Hemen hatırladım', color: 'bg-emerald-600 hover:bg-emerald-500', icon: CheckCircle2 },
  { value: 4, label: 'İyi', desc: 'Biraz düşündüm', color: 'bg-green-600 hover:bg-green-500', icon: CheckCircle2 },
  { value: 3, label: 'Zorlandım', desc: 'Doğru ama güçlükle', color: 'bg-yellow-600 hover:bg-yellow-500', icon: Minus },
  { value: 2, label: 'Zor', desc: 'Kısmen hatırladım', color: 'bg-orange-600 hover:bg-orange-500', icon: Minus },
  { value: 0, label: 'Unuttum', desc: 'Hiç hatırlamadım', color: 'bg-red-700 hover:bg-red-600', icon: XCircle },
]

const TYPE_ICON: Record<string, string> = {
  mistake: '⚠️', repertoire: '📖', endgame: '♚', tactic: '⚔️', concept: '💡',
}

const PHASE_LABEL: Record<string, string> = {
  opening: 'Açılış', middlegame: 'Orta oyun', endgame: 'Oyun sonu',
}

const GOAL_LABEL: Record<string, string> = {
  win: 'Kazanmayı bul', draw: 'Berabere yap', defend: 'Savun',
}

function getBestMoveArrow(move: string | undefined, fen: string): { startSquare: string; endSquare: string; color: string }[] {
  if (!move) return []
  // UCI format: e.g. "e2e4", "g1f3", "e7e8q"
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
    return [{ startSquare: move.slice(0, 2), endSquare: move.slice(2, 4), color: '#22c55e' }]
  }
  // SAN format
  try {
    const chess = new Chess(fen)
    const m = chess.move(move)
    if (m) return [{ startSquare: m.from, endSquare: m.to, color: '#22c55e' }]
  } catch { /* ignore */ }
  return []
}

function getUserMoveHighlight(move: string | undefined, fen: string): Record<string, React.CSSProperties> {
  if (!move) return {}
  try {
    const chess = new Chess(fen)
    const m = chess.move(move)
    if (m) return {
      [m.from]: { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
      [m.to]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
    }
  } catch { /* ignore */ }
  return {}
}

export function StudySessionCard({ item, context, onNext, onPrev, onReviewed, onFinish, isFirst, isLast }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startTime] = useState(Date.now())

  const hasFen = !!context?.fen
  const hasBoard = hasFen && (item.type === 'mistake' || item.type === 'endgame' || item.type === 'tactic')

  const bestMoveArrows = revealed && hasFen
    ? getBestMoveArrow(context?.bestMove ?? context?.solution, context!.fen!)
    : []

  const userMoveHighlights = revealed && hasFen && item.type === 'mistake'
    ? getUserMoveHighlight(context?.userMove, context!.fen!)
    : {}

  async function handleQuality(quality: number) {
    setSubmitting(true)
    const timeSpent = Math.round((Date.now() - startTime) / 1000)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studyItemId: item.id, quality, timeSpentSeconds: timeSpent }),
    })
    if (res.ok) {
      const { interval, nextReviewAt } = await res.json()
      const nextDate = new Date(nextReviewAt).toLocaleDateString('tr-TR')
      toast.success(`Kaydedildi · Sonraki tekrar: ${nextDate} (${interval} gün)`)
      onReviewed(item.id)
      setRevealed(false)
      setSubmitting(false)
      if (!isLast) onNext()
      else onFinish()
    } else {
      toast.error('Kayıt başarısız')
      setSubmitting(false)
    }
  }

  const promptText: Record<string, string> = {
    mistake: `Bu pozisyonda ${context?.phase ? PHASE_LABEL[context.phase] + ' fazında ' : ''}doğru hamleyi bul.`,
    tactic: context?.motif ? `${context.motif} taktiğini çöz.` : 'Bu pozisyondaki taktiği çöz.',
    endgame: context?.goal ? GOAL_LABEL[context.goal] + '.' : 'Bu oyun sonu pozisyonunu çöz.',
    repertoire: 'Bu satırdaki ana planı ve kritik hamleleri hatırla.',
    concept: 'Bu konsepti kendi cümlelerinle açıkla.',
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{TYPE_ICON[item.type] ?? '📋'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{item.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {context?.phase && (
                <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                  {PHASE_LABEL[context.phase]}
                </Badge>
              )}
              {context?.motif && (
                <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-xs">
                  {context.motif}
                </Badge>
              )}
              {context?.goal && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                  {GOAL_LABEL[context.goal]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Board + Content layout */}
        {hasBoard ? (
          <div className={cn('flex gap-5', revealed ? 'flex-col sm:flex-row items-start' : 'flex-col items-center')}>
            {/* Chess Board */}
            <div className="flex-shrink-0 self-center sm:self-start">
              <ChessBoard
                fen={context!.fen!}
                width={revealed ? 260 : 300}
                arrows={bestMoveArrows}
                highlightSquares={userMoveHighlights}
              />
            </div>

            {/* Right side: prompt + answer */}
            <div className="flex-1 min-w-0 w-full space-y-3">
              {/* Prompt */}
              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-800">
                <p className="text-zinc-300 text-sm leading-relaxed">{promptText[item.type]}</p>
                {item.type === 'mistake' && context?.centipawnLoss && (
                  <p className="text-red-400 text-xs mt-1.5 font-mono">
                    CP Kaybı: {context.centipawnLoss}
                  </p>
                )}
              </div>

              {/* Revealed answer */}
              {revealed && (
                <div className="space-y-2">
                  {/* Mistake: show user move vs best move */}
                  {item.type === 'mistake' && (
                    <div className="space-y-1.5">
                      {context?.userMove && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-400 font-mono text-base">✗</span>
                          <span className="text-zinc-500 text-xs">Oynadın:</span>
                          <code className="text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded font-mono">{context.userMove}</code>
                        </div>
                      )}
                      {context?.bestMove && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-400 font-mono text-base">✓</span>
                          <span className="text-zinc-500 text-xs">Doğru:</span>
                          <code className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">{context.bestMove}</code>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tactic: solution */}
                  {item.type === 'tactic' && context?.solution && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-emerald-400 text-xs font-medium mb-0.5">Çözüm</p>
                      <code className="text-emerald-300 font-mono text-sm">{context.solution}</code>
                    </div>
                  )}

                  {/* Endgame: notes */}
                  {item.type === 'endgame' && context?.notes && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">{context.notes}</p>
                    </div>
                  )}

                  {/* General notes */}
                  {context?.notes && item.type === 'mistake' && (
                    <div className="bg-zinc-800 rounded-lg p-2.5">
                      <p className="text-zinc-400 text-xs">{context.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Text-only items: repertoire, concept */
          <div className="space-y-3">
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-800">
              <p className="text-zinc-300 text-sm leading-relaxed">{promptText[item.type]}</p>
            </div>

            {item.type === 'repertoire' && context?.moves && (
              <div className="bg-zinc-800 rounded-xl p-3">
                <p className="text-zinc-500 text-xs mb-1">Hamle dizisi</p>
                <p className="text-zinc-200 font-mono text-sm leading-relaxed">{context.moves}</p>
              </div>
            )}

            {revealed && (
              <div className="space-y-2">
                {context?.mainIdea && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-blue-400 text-xs font-medium mb-1">Ana Fikir</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{context.mainIdea}</p>
                  </div>
                )}
                {context?.typicalPlan && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-emerald-400 text-xs font-medium mb-1">Tipik Plan</p>
                    <p className="text-zinc-300 text-sm">{context.typicalPlan}</p>
                  </div>
                )}
                {context?.dangerousIdeas && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-xs font-medium mb-1">Tehlikeli Fikirler</p>
                    <p className="text-zinc-300 text-sm">{context.dangerousIdeas}</p>
                  </div>
                )}
                {!context?.mainIdea && !context?.typicalPlan && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-zinc-300 text-sm">{item.description ?? item.title}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reveal button */}
        {!revealed && (
          <Button
            onClick={() => setRevealed(true)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
          >
            Cevabı Gör
          </Button>
        )}

        {/* Quality buttons */}
        {revealed && (
          <div className="space-y-2">
            <p className="text-zinc-500 text-xs text-center">Ne kadar iyi hatırladın?</p>
            <div className="grid grid-cols-5 gap-1.5">
              {QUALITY_CONFIG.map(q => (
                <button
                  key={q.value}
                  onClick={() => handleQuality(q.value)}
                  disabled={submitting}
                  title={q.desc}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-white text-xs font-medium transition-all disabled:opacity-50',
                    q.color
                  )}
                >
                  <q.icon className="w-3.5 h-3.5" />
                  <span className="text-xs leading-tight text-center">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRevealed(false); onPrev() }}
            disabled={isFirst}
            className="border-zinc-700 text-zinc-400 hover:text-white gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Önceki
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRevealed(false); if (isLast) onFinish(); else onNext() }}
            className="border-zinc-700 text-zinc-400 hover:text-white gap-1"
          >
            {isLast ? 'Bitir' : 'Atla'} <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
