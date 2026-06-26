'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Game, Move, EngineAnalysis, Mistake, MoveClassification } from '@/types'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { MoveList } from '@/components/chess/MoveList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, Zap, Brain, CheckCircle2, XCircle, Loader2, Sparkles, RefreshCw,
} from 'lucide-react'
import {
  classificationColor, classificationLabel, classificationIcon,
  evalToString, formatDistanceToNow
} from '@/lib/chess/utils'
import { cn } from '@/lib/utils'

interface MoveWithAnalysis extends Move {
  classification?: MoveClassification | null
  centipawn_loss?: number | null
}

interface Props {
  game: Game
  moves: Move[]
  engineAnalysis: EngineAnalysis[]
  mistakes: Mistake[]
}

const SEVERITY_LABEL: Record<string, string> = {
  blunder: '?? Blunder',
  mistake: '? Hata',
  inaccuracy: '?! Yanlışlık',
}

const PHASE_LABEL: Record<string, string> = {
  opening: 'Açılış',
  middlegame: 'Orta oyun',
  endgame: 'Oyun sonu',
}

export function GameViewer({ game, moves, engineAnalysis: initialAnalysis, mistakes: initialMistakes }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [notes, setNotes] = useState(game.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [engineAnalysis, setEngineAnalysis] = useState(initialAnalysis)
  const [mistakes, setMistakes] = useState(initialMistakes)
  const [gameStatus, setGameStatus] = useState(game.analysis_status)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const analysisMap = Object.fromEntries(engineAnalysis.map(a => [a.move_id, a]))

  const movesWithAnalysis: MoveWithAnalysis[] = moves.map(m => ({
    ...m,
    classification: (analysisMap[m.id]?.classification ?? null) as MoveClassification | null,
    centipawn_loss: analysisMap[m.id]?.centipawn_loss ?? null,
  }))

  const currentFen = currentIndex === -1
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : (moves[currentIndex]?.fen_after ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

  const currentAnalysis = currentIndex >= 0 ? analysisMap[moves[currentIndex]?.id] : null
  const currentMove = currentIndex >= 0 ? moves[currentIndex] : null

  const goToStart = () => setCurrentIndex(-1)
  const goToEnd = () => setCurrentIndex(moves.length - 1)
  const goBack = () => setCurrentIndex(i => Math.max(-1, i - 1))
  const goForward = () => setCurrentIndex(i => Math.min(moves.length - 1, i + 1))

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') goBack()
      if (e.key === 'ArrowRight') goForward()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // Poll for analysis completion
  useEffect(() => {
    if (gameStatus !== 'in_progress') return

    let elapsed = 0
    pollingRef.current = setInterval(async () => {
      elapsed += 3
      setAnalysisProgress(Math.min(90, elapsed * 3))

      const supabase = createClient()
      const { data } = await supabase
        .from('games')
        .select('analysis_status')
        .eq('id', game.id)
        .single()

      if (data?.analysis_status === 'completed') {
        clearInterval(pollingRef.current!)
        setAnalysisProgress(100)
        setGameStatus('completed')
        setAnalyzing(false)

        // Reload analysis data
        const [{ data: analysis }, { data: newMistakes }] = await Promise.all([
          supabase.from('engine_analysis').select('*').eq('game_id', game.id),
          supabase.from('mistakes').select('*').eq('game_id', game.id),
        ])
        if (analysis) setEngineAnalysis(analysis)
        if (newMistakes) setMistakes(newMistakes)
        toast.success('Analiz tamamlandı!')
      } else if (data?.analysis_status === 'failed') {
        clearInterval(pollingRef.current!)
        setAnalyzing(false)
        setGameStatus('failed')
        toast.error('Analiz başarısız oldu.')
      }
    }, 3000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [gameStatus, game.id])

  async function startAnalysis(reanalyze = false) {
    if (reanalyze) {
      setEngineAnalysis([])
      setMistakes([])
    }
    setAnalyzing(true)
    setAnalysisProgress(0)
    setGameStatus('in_progress')

    toast.info(`${moves.length} hamle analiz ediliyor... Bu ${Math.ceil(moves.length * 0.3)} saniye sürebilir.`)

    const res = await fetch(`/api/games/${game.id}/analyze`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      toast.error('Analiz başarısız: ' + err.error)
      setAnalyzing(false)
      setGameStatus('failed')
    }
    // Success handled by polling
  }

  async function generateAiSummary() {
    setAiLoading(true)
    const res = await fetch('/api/ai/game-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: game.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setAiSummary(data.summary)
    } else {
      toast.error(data.error ?? 'AI analiz başarısız')
    }
    setAiLoading(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    const supabase = createClient()
    await supabase.from('games').update({ notes }).eq('id', game.id)
    toast.success('Notlar kaydedildi')
    setSavingNotes(false)
  }

  const orientation = (game.user_color ?? 'white') as 'white' | 'black'

  const blunders = mistakes.filter(m => m.severity === 'blunder')
  const mistakeList = mistakes.filter(m => m.severity === 'mistake')
  const inaccuracies = mistakes.filter(m => m.severity === 'inaccuracy')

  const avgCpLoss = engineAnalysis.length
    ? Math.round(engineAnalysis.reduce((s, a) => s + (a.centipawn_loss ?? 0), 0) / engineAnalysis.length)
    : null

  function cpLossToAccuracy(avgCp: number): number {
    return Math.max(0, Math.min(100,
      Math.round(103.1668 * Math.exp(-0.04354 * avgCp) - 3.1669 + 1)
    ))
  }

  const userColor = game.user_color ?? 'white'
  const oppColor = userColor === 'white' ? 'black' : 'white'
  const userMoveIds = new Set(moves.filter(m => m.color === userColor).map(m => m.id))
  const oppMoveIds = new Set(moves.filter(m => m.color === oppColor).map(m => m.id))
  const userAnalysis = engineAnalysis.filter(a => userMoveIds.has(a.move_id))
  const oppAnalysis = engineAnalysis.filter(a => oppMoveIds.has(a.move_id))
  const userAvgCp = userAnalysis.length
    ? userAnalysis.reduce((s, a) => s + (a.centipawn_loss ?? 0), 0) / userAnalysis.length
    : null
  const oppAvgCp = oppAnalysis.length
    ? oppAnalysis.reduce((s, a) => s + (a.centipawn_loss ?? 0), 0) / oppAnalysis.length
    : null
  const userAccuracy = userAvgCp !== null ? cpLossToAccuracy(userAvgCp) : null
  const oppAccuracy = oppAvgCp !== null ? cpLossToAccuracy(oppAvgCp) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-sm mb-1 flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Geri
          </button>
          <h1 className="text-xl font-bold text-white">
            vs {game.opponent ?? 'Bilinmiyor'}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {game.result === 'win' && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Kazandı</Badge>}
            {game.result === 'loss' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Kaybetti</Badge>}
            {game.result === 'draw' && <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Berabere</Badge>}
            {game.opening_name && <span className="text-zinc-400 text-sm">{game.opening_name}</span>}
            {game.eco_code && <span className="text-zinc-600 text-sm">({game.eco_code})</span>}
            <span className="text-zinc-600 text-sm">{formatDistanceToNow(game.played_at)}</span>
          </div>
        </div>

        {/* Analysis button / status */}
        {gameStatus === 'pending' && (
          <Button
            onClick={() => startAnalysis()}
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <Brain className="w-4 h-4" />
            Stockfish Analizi Başlat
          </Button>
        )}
        {gameStatus === 'in_progress' && (
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <div className="w-40">
              <p className="text-amber-400 text-xs mb-1">Analiz ediliyor...</p>
              <Progress value={analysisProgress} className="h-1.5" />
            </div>
          </div>
        )}
        {gameStatus === 'completed' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Analiz tamamlandı
            </div>
            <Button
              onClick={() => startAnalysis(true)}
              disabled={analyzing}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yeniden Analiz Et
            </Button>
          </div>
        )}
        {gameStatus === 'failed' && (
          <Button onClick={() => startAnalysis()} variant="outline" size="sm" className="border-red-500/50 text-red-400 gap-2">
            <XCircle className="w-4 h-4" /> Tekrar dene
          </Button>
        )}
      </div>

      {/* Analysis Summary Bar */}
      {gameStatus === 'completed' && engineAnalysis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={cn(
              'text-xl font-bold',
              userAccuracy !== null && userAccuracy >= 85 ? 'text-emerald-400'
              : userAccuracy !== null && userAccuracy >= 70 ? 'text-yellow-400'
              : 'text-orange-400'
            )}>
              {userAccuracy !== null ? `${userAccuracy}%` : '—'}
            </p>
            <p className="text-zinc-500 text-xs">Senin Doğruluğun</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={cn(
              'text-xl font-bold',
              oppAccuracy !== null && oppAccuracy >= 85 ? 'text-emerald-400'
              : oppAccuracy !== null && oppAccuracy >= 70 ? 'text-yellow-400'
              : 'text-orange-400'
            )}>
              {oppAccuracy !== null ? `${oppAccuracy}%` : '—'}
            </p>
            <p className="text-zinc-500 text-xs">Rakip Doğruluğu</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-red-400 text-xl font-bold">{blunders.length}</p>
            <p className="text-zinc-500 text-xs">Blunder ??</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-orange-400 text-xl font-bold">{mistakeList.length}</p>
            <p className="text-zinc-500 text-xs">Hata ?</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-yellow-400 text-xl font-bold">{inaccuracies.length}</p>
            <p className="text-zinc-500 text-xs">Yanlışlık ?!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Board + Controls */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-center">
                <ChessBoard fen={currentFen} orientation={orientation} width={480} />
              </div>

              {/* Current move analysis */}
              {currentAnalysis && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className={cn('text-sm font-semibold', classificationColor(currentAnalysis.classification as MoveClassification))}>
                      {classificationIcon(currentAnalysis.classification as MoveClassification)}{' '}
                      {classificationLabel(currentAnalysis.classification as MoveClassification)}
                    </span>
                    <div className="flex items-center gap-3">
                      {currentAnalysis.centipawn_loss !== null && currentAnalysis.centipawn_loss > 0 && (
                        <span className="text-zinc-500 text-xs">
                          -{currentAnalysis.centipawn_loss} cp
                        </span>
                      )}
                      <span className="text-zinc-400 text-sm font-mono">
                        {evalToString(currentAnalysis.eval_after, currentMove?.color ?? 'white')}
                      </span>
                    </div>
                  </div>

                  {currentAnalysis.best_move_san &&
                   currentAnalysis.best_move_san !== currentMove?.san &&
                   (currentAnalysis.classification === 'mistake' || currentAnalysis.classification === 'blunder') && (
                    <div className="px-3 py-2 bg-blue-500/10 rounded-lg flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-blue-300 text-xs">
                        En iyi hamle: <span className="font-mono font-bold text-blue-200">{currentAnalysis.best_move_san}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={goToStart} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goBack} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-zinc-500 text-xs min-w-[90px] text-center">
                  {currentIndex === -1 ? 'Başlangıç' : `${currentIndex + 1} / ${moves.length}`}
                </span>
                <Button variant="outline" size="sm" onClick={goForward} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToEnd} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-center text-zinc-600 text-xs mt-1">← → klavye kısayolları</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Move List */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Hamleler</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto pt-0">
              <MoveList
                moves={movesWithAnalysis}
                currentIndex={currentIndex}
                onMoveClick={setCurrentIndex}
              />
            </CardContent>
          </Card>

          {/* Mistakes Panel */}
          {(blunders.length > 0 || mistakeList.length > 0) && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Kritik Anlar ({blunders.length + mistakeList.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 max-h-60 overflow-y-auto">
                {[...blunders, ...mistakeList].map((m) => {
                  const moveObj = moves.find(mv => mv.id === m.move_id)
                  const moveIdx = moveObj ? moves.indexOf(moveObj) : -1
                  const moveNum = moveObj ? Math.ceil((moveIdx + 1) / 2) : null

                  return (
                    <button
                      key={m.id}
                      onClick={() => moveIdx >= 0 && setCurrentIndex(moveIdx)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg transition-colors',
                        m.severity === 'blunder'
                          ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold', m.severity === 'blunder' ? 'text-red-400' : 'text-orange-400')}>
                          {SEVERITY_LABEL[m.severity]}
                        </span>
                        <span className="text-zinc-300 text-xs font-mono">{m.user_move}</span>
                        <span className="text-zinc-600 text-xs ml-auto">
                          {moveNum !== null ? `${moveNum}. hamle` : ''}
                          {' '}
                          {m.game_phase ? PHASE_LABEL[m.game_phase] : ''}
                        </span>
                      </div>
                      {m.best_move && (
                        <p className="text-zinc-500 text-xs mt-0.5">
                          En iyi: <span className="font-mono text-blue-400">{m.best_move}</span>
                          {m.centipawn_loss && (
                            <span className="ml-2 text-zinc-600">−{m.centipawn_loss} cp</span>
                          )}
                        </p>
                      )}
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* AI Coach Analysis */}
          {gameStatus === 'completed' && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Koç Analizi
                  </CardTitle>
                  {!aiSummary && (
                    <Button
                      onClick={generateAiSummary}
                      disabled={aiLoading}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs gap-1.5"
                    >
                      {aiLoading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Analiz yapılıyor...</>
                        : <><Sparkles className="w-3 h-3" /> Analiz Et</>}
                    </Button>
                  )}
                  {aiSummary && (
                    <button
                      onClick={() => setAiSummary(null)}
                      className="text-zinc-600 hover:text-zinc-400 text-xs"
                    >
                      Yenile
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {aiLoading && (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    <p className="text-zinc-400 text-sm">Claude analiz ediyor...</p>
                  </div>
                )}
                {aiSummary && !aiLoading && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{aiSummary}</p>
                  </div>
                )}
                {!aiSummary && !aiLoading && (
                  <p className="text-zinc-600 text-xs text-center py-2">
                    Claude bu oyunu değerlendirip Türkçe analiz yazar.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Notlarım</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bu oyun hakkında notlarını yaz..."
                rows={4}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm resize-none focus:border-amber-500"
              />
              <Button
                onClick={saveNotes}
                disabled={savingNotes}
                size="sm"
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                {savingNotes ? 'Kaydediliyor...' : 'Notu Kaydet'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
