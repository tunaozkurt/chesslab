'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Game, Move, EngineAnalysis, Mistake, MoveClassification } from '@/types'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { MoveList } from '@/components/chess/MoveList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, Zap, Brain
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

export function GameViewer({ game, moves, engineAnalysis, mistakes }: Props) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [notes, setNotes] = useState(game.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const analysisMap = Object.fromEntries(engineAnalysis.map(a => [a.move_id, a]))

  const movesWithAnalysis: MoveWithAnalysis[] = moves.map(m => ({
    ...m,
    classification: (analysisMap[m.id]?.classification ?? null) as MoveClassification | null,
    centipawn_loss: analysisMap[m.id]?.centipawn_loss ?? null,
  }))

  const currentFen = currentIndex === -1
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : moves[currentIndex]?.fen_after ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  const currentAnalysis = currentIndex >= 0 ? analysisMap[moves[currentIndex]?.id] : null
  const currentMove = currentIndex >= 0 ? moves[currentIndex] : null

  const goToStart = () => setCurrentIndex(-1)
  const goToEnd = () => setCurrentIndex(moves.length - 1)
  const goBack = () => setCurrentIndex(i => Math.max(-1, i - 1))
  const goForward = () => setCurrentIndex(i => Math.min(moves.length - 1, i + 1))

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goBack()
      if (e.key === 'ArrowRight') goForward()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  async function saveNotes() {
    setSavingNotes(true)
    const supabase = createClient()
    await supabase.from('games').update({ notes }).eq('id', game.id)
    toast.success('Notlar kaydedildi')
    setSavingNotes(false)
  }

  async function startAnalysis() {
    setAnalyzing(true)
    const supabase = createClient()
    await supabase.from('games').update({ analysis_status: 'pending' }).eq('id', game.id)
    toast.info('Analiz kuyruğa eklendi. Bu sayfa Stockfish entegrasyonu tamamlandığında çalışacak.')
    setAnalyzing(false)
  }

  const orientation = game.user_color ?? 'white'

  const criticalMistakes = mistakes.filter(m => m.severity === 'blunder' || m.severity === 'mistake')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-sm mb-1 flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Geri
          </button>
          <h1 className="text-xl font-bold text-white">
            vs {game.opponent ?? 'Bilinmiyor'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {game.result === 'win' && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Kazandı</Badge>}
            {game.result === 'loss' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Kaybetti</Badge>}
            {game.result === 'draw' && <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Berabere</Badge>}
            {game.opening_name && <span className="text-zinc-400 text-sm">{game.opening_name}</span>}
            {game.eco_code && <span className="text-zinc-600 text-sm">({game.eco_code})</span>}
            <span className="text-zinc-600 text-sm">{formatDistanceToNow(game.played_at)}</span>
          </div>
        </div>
        {game.analysis_status !== 'completed' && (
          <Button
            onClick={startAnalysis}
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
          >
            <Brain className="w-4 h-4" />
            {analyzing ? 'Sıraya alındı...' : 'Stockfish Analizi Başlat'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Board + Controls */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-center">
                <ChessBoard fen={currentFen} orientation={orientation as 'white' | 'black'} width={480} />
              </div>

              {/* Eval bar text */}
              {currentAnalysis && (
                <div className="mt-3 flex items-center justify-between px-2">
                  <span className={cn('text-sm font-medium', classificationColor(currentAnalysis.classification as any))}>
                    {classificationIcon(currentAnalysis.classification as any)} {classificationLabel(currentAnalysis.classification as any)}
                  </span>
                  {currentAnalysis.centipawn_loss !== null && currentAnalysis.centipawn_loss !== undefined && (
                    <span className="text-zinc-500 text-xs">
                      -{currentAnalysis.centipawn_loss.toFixed(0)} cp kayıp
                    </span>
                  )}
                  {currentAnalysis.eval_after !== null && currentAnalysis.eval_after !== undefined && (
                    <span className="text-zinc-400 text-sm font-mono">
                      {evalToString(currentAnalysis.eval_after, currentMove?.color ?? 'white')}
                    </span>
                  )}
                </div>
              )}

              {/* Engine suggestion */}
              {currentAnalysis?.best_move_san && currentAnalysis.best_move_san !== currentMove?.san && (
                <div className="mt-2 px-2 py-1.5 bg-blue-500/10 rounded-lg flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-blue-300 text-xs">
                    En iyi hamle: <span className="font-mono font-semibold">{currentAnalysis.best_move_san}</span>
                  </span>
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
                <span className="text-zinc-500 text-xs min-w-[80px] text-center">
                  {currentIndex === -1 ? 'Başlangıç' : `Hamle ${currentIndex + 1}/${moves.length}`}
                </span>
                <Button variant="outline" size="sm" onClick={goForward} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToEnd} className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-center text-zinc-600 text-xs mt-1">← → tuşlarını kullanabilirsin</p>
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
            <CardContent className="max-h-64 overflow-y-auto">
              <MoveList
                moves={movesWithAnalysis}
                currentIndex={currentIndex}
                onMoveClick={setCurrentIndex}
              />
            </CardContent>
          </Card>

          {/* Critical Mistakes */}
          {criticalMistakes.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Kritik Hatalar ({criticalMistakes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalMistakes.map((m) => {
                  const moveObj = moves.find(mv => mv.id === m.move_id)
                  const moveIdx = moves.indexOf(moveObj!)
                  return (
                    <button
                      key={m.id}
                      onClick={() => moveIdx >= 0 && setCurrentIndex(moveIdx)}
                      className="w-full text-left p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 text-xs font-semibold">
                          {m.severity === 'blunder' ? '??' : '?'}
                        </span>
                        <span className="text-zinc-300 text-xs font-mono">{m.user_move}</span>
                        {moveObj && (
                          <span className="text-zinc-500 text-xs ml-auto">
                            {Math.ceil((moveIdx + 1) / 2)}. hamle
                          </span>
                        )}
                      </div>
                      {m.best_move && (
                        <p className="text-zinc-500 text-xs mt-0.5">
                          En iyi: <span className="font-mono text-blue-400">{m.best_move}</span>
                        </p>
                      )}
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Notlarım</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
