'use client'

import { Move } from '@/types'
import { classificationIcon, classificationColor } from '@/lib/chess/utils'
import { MoveClassification } from '@/types'
import { cn } from '@/lib/utils'

interface MoveWithAnalysis extends Move {
  classification?: MoveClassification | null
  centipawn_loss?: number | null
}

interface Props {
  moves: MoveWithAnalysis[]
  currentIndex: number
  onMoveClick: (index: number) => void
}

export function MoveList({ moves, currentIndex, onMoveClick }: Props) {
  const movePairs: [MoveWithAnalysis, MoveWithAnalysis | null][] = []

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1] ?? null])
  }

  return (
    <div className="font-mono text-sm space-y-0.5">
      {movePairs.map((pair, pairIdx) => {
        const whiteMove = pair[0]
        const blackMove = pair[1]
        const whiteIdx = pairIdx * 2
        const blackIdx = pairIdx * 2 + 1

        return (
          <div key={pairIdx} className="flex items-center gap-1">
            <span className="text-zinc-600 w-7 text-right flex-shrink-0">
              {pairIdx + 1}.
            </span>
            <button
              onClick={() => onMoveClick(whiteIdx)}
              className={cn(
                'px-2 py-0.5 rounded text-left min-w-[60px] transition-colors',
                currentIndex === whiteIdx
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-zinc-300 hover:bg-zinc-800'
              )}
            >
              {whiteMove.san}
              {whiteMove.classification && (
                <span className={cn('ml-1 text-xs', classificationColor(whiteMove.classification))}>
                  {classificationIcon(whiteMove.classification)}
                </span>
              )}
            </button>
            {blackMove && (
              <button
                onClick={() => onMoveClick(blackIdx)}
                className={cn(
                  'px-2 py-0.5 rounded text-left min-w-[60px] transition-colors',
                  currentIndex === blackIdx
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                {blackMove.san}
                {blackMove.classification && (
                  <span className={cn('ml-1 text-xs', classificationColor(blackMove.classification))}>
                    {classificationIcon(blackMove.classification)}
                  </span>
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
