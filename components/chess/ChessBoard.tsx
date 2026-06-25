'use client'

import { Chessboard } from 'react-chessboard'

interface Props {
  fen: string
  orientation?: 'white' | 'black'
  highlightSquares?: Record<string, React.CSSProperties>
  arrows?: { startSquare: string; endSquare: string; color: string }[]
  width?: number
}

export function ChessBoard({
  fen,
  orientation = 'white',
  highlightSquares = {},
  arrows = [],
  width = 480,
}: Props) {
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          squareStyles: highlightSquares,
          arrows: arrows,
          allowDragging: false,
          darkSquareStyle: { backgroundColor: '#4a5568' },
          lightSquareStyle: { backgroundColor: '#e8d5a3' },
          boardStyle: { width: '100%' },
        }}
      />
    </div>
  )
}
