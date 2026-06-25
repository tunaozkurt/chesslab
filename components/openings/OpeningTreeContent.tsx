'use client'

import { useState, useMemo } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { RepertoireLine } from '@/types'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, GitBranch } from 'lucide-react'

interface Props {
  initialLines: RepertoireLine[]
}

interface TreeNode {
  san: string
  fen: string
  children: Record<string, TreeNode>
  lineNames: string[]
  depth: number
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function parseMoveTokens(movesStr: string): string[] {
  return movesStr
    .trim()
    .split(/\s+/)
    .filter(t => t && !t.match(/^\d+\.+$/))
}

function buildTree(lines: RepertoireLine[]): Record<string, TreeNode> {
  const roots: Record<string, TreeNode> = {}

  for (const line of lines) {
    if (!line.moves?.trim()) continue
    const chess = new Chess()
    const tokens = parseMoveTokens(line.moves)
    let current = roots
    let depth = 0

    for (const token of tokens) {
      let moved = false
      try {
        chess.move(token)
        moved = true
      } catch { break }
      if (!moved) break
      const fen = chess.fen()
      if (!current[token]) {
        current[token] = { san: token, fen, children: {}, lineNames: [], depth }
      }
      if (!current[token].lineNames.includes(line.name)) {
        current[token].lineNames.push(line.name)
      }
      current = current[token].children
      depth++
    }
  }

  return roots
}

function TreeNodeView({
  node,
  depth,
  onSelect,
  selectedFen,
}: {
  node: TreeNode
  depth: number
  onSelect: (fen: string, san: string) => void
  selectedFen: string
}) {
  const childKeys = Object.keys(node.children)
  const hasChildren = childKeys.length > 0
  const [expanded, setExpanded] = useState(node.depth < 3)
  const isSelected = node.fen === selectedFen

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.fen, node.san)
          if (hasChildren) setExpanded(e => !e)
        }}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={cn(
          'flex items-center gap-1.5 py-0.5 pr-2 rounded text-sm hover:bg-zinc-800 transition-colors w-full text-left',
          isSelected && 'bg-amber-500/20'
        )}
      >
        {hasChildren ? (
          expanded
            ? <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            : <ChevronRight className="w-3 h-3 text-zinc-500 flex-shrink-0" />
        ) : (
          <span className="w-3 h-3 flex-shrink-0" />
        )}
        <span className={cn('font-mono font-medium', isSelected ? 'text-amber-300' : 'text-zinc-200')}>
          {node.san}
        </span>
        {childKeys.length > 1 && (
          <span className="text-zinc-600 text-xs ml-auto">{childKeys.length} dal</span>
        )}
        {!hasChildren && node.lineNames.length > 0 && (
          <span className="text-zinc-600 text-xs ml-auto truncate max-w-[100px]">{node.lineNames[0]}</span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {Object.values(node.children).map(child => (
            <TreeNodeView
              key={child.san + child.fen}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedFen={selectedFen}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OpeningTreeContent({ initialLines }: Props) {
  const [colorTab, setColorTab] = useState<'white' | 'black'>('white')
  const [selectedFen, setSelectedFen] = useState(STARTING_FEN)
  const [selectedSan, setSelectedSan] = useState('Başlangıç')

  const whiteCount = initialLines.filter(l => l.color === 'white').length
  const blackCount = initialLines.filter(l => l.color === 'black').length

  const filteredLines = useMemo(
    () => initialLines.filter(l => l.color === colorTab),
    [initialLines, colorTab]
  )
  const tree = useMemo(() => buildTree(filteredLines), [filteredLines])

  function handleColorChange(c: 'white' | 'black') {
    setColorTab(c)
    setSelectedFen(STARTING_FEN)
    setSelectedSan('Başlangıç')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-emerald-400" />
          Açılış Ağacı
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Repertuarındaki tüm satırların hamle ağacı</p>
      </div>

      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl w-fit border border-zinc-800">
        <button
          onClick={() => handleColorChange('white')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            colorTab === 'white' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          ♔ Beyaz ({whiteCount})
        </button>
        <button
          onClick={() => handleColorChange('black')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            colorTab === 'black' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          ♚ Siyah ({blackCount})
        </button>
      </div>

      {filteredLines.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-5xl mb-3">🌳</div>
          <p className="text-zinc-400 font-medium">
            {colorTab === 'white' ? 'Beyaz' : 'Siyah'} için henüz repertuar satırı yok
          </p>
          <p className="text-zinc-600 text-sm mt-1">
            Açılışlar → Repertuar sekmesinden satır ekle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-auto max-h-[70vh]">
            <div className="mb-2 pb-2 border-b border-zinc-800">
              <button
                onClick={() => { setSelectedFen(STARTING_FEN); setSelectedSan('Başlangıç') }}
                className={cn(
                  'flex items-center gap-2 py-1 px-2 rounded text-sm w-full text-left transition-colors',
                  selectedFen === STARTING_FEN
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'hover:bg-zinc-800 text-zinc-400'
                )}
              >
                <span className="text-base">♟</span>
                <span>Başlangıç Pozisyonu</span>
                <span className="ml-auto text-xs text-zinc-600">{filteredLines.length} satır</span>
              </button>
            </div>
            {Object.values(tree).map(node => (
              <TreeNodeView
                key={node.san + node.fen}
                node={node}
                depth={0}
                onSelect={(fen, san) => { setSelectedFen(fen); setSelectedSan(san) }}
                selectedFen={selectedFen}
              />
            ))}
          </div>

          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sticky top-4">
              <div className="mb-3">
                <p className="text-zinc-500 text-xs">Seçili hamle</p>
                <p className="text-white font-mono font-bold text-lg">
                  {selectedSan !== 'Başlangıç' ? selectedSan : '—'}
                </p>
              </div>
              <ChessBoard
                fen={selectedFen}
                width={268}
                orientation={colorTab === 'black' ? 'black' : 'white'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
