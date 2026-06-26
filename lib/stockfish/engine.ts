import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export interface StockfishResult {
  fen: string
  bestMove: string | null
  evalCp: number       // centipawn from side-to-move perspective
  depth: number
  pv: string | null
}

const STOCKFISH_PATH = path.join(
  process.cwd(),
  'node_modules/stockfish/bin/stockfish-18-lite-single.js'
)

function parseInfoLine(line: string): { evalCp: number; pv: string | null } | null {
  // Aspiration window bounds are unreliable — skip them
  if (line.includes('lowerbound') || line.includes('upperbound')) return null

  let evalCp: number
  const cpMatch = line.match(/score cp (-?\d+)/)
  const mateMatch = line.match(/score mate (-?\d+)/)

  if (cpMatch) {
    evalCp = parseInt(cpMatch[1], 10)
  } else if (mateMatch) {
    const mateIn = parseInt(mateMatch[1], 10)
    evalCp = mateIn > 0 ? 30000 : -30000
  } else {
    return null
  }

  const pvMatch = line.match(/ pv (.+)/)
  return { evalCp, pv: pvMatch ? pvMatch[1].trim() : null }
}

export async function analyzePosition(
  fen: string,
  depth = 16
): Promise<StockfishResult> {
  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn(process.execPath, [STOCKFISH_PATH], {
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    let bestEval = 0
    let bestPv: string | null = null
    let bestMove: string | null = null
    let settled = false
    let uciReady = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        proc.kill()
        resolve({ fen, bestMove, evalCp: bestEval, depth, pv: bestPv })
      }
    }, 8000)

    proc.stdout!.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // UCI handshake
        if (trimmed === 'uciok') {
          proc.stdin!.write('isready\n')
          continue
        }

        if (trimmed === 'readyok' && !uciReady) {
          uciReady = true
          proc.stdin!.write(`position fen ${fen}\n`)
          proc.stdin!.write(`go depth ${depth}\n`)
          continue
        }

        if (trimmed.startsWith('info') && (trimmed.includes('score cp') || trimmed.includes('score mate'))) {
          const parsed = parseInfoLine(trimmed)
          if (parsed) {
            bestEval = parsed.evalCp
            bestPv = parsed.pv
          }
        }

        if (trimmed.startsWith('bestmove')) {
          const m = trimmed.match(/bestmove (\S+)/)
          bestMove = m ? m[1] : null
          if (bestMove === '(none)') bestMove = null

          if (!settled) {
            settled = true
            clearTimeout(timeout)
            proc.kill()
            resolve({ fen, bestMove, evalCp: bestEval, depth, pv: bestPv })
          }
        }
      }
    })

    proc.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    // Start UCI handshake — position/go are sent after readyok
    proc.stdin!.write('uci\n')
  })
}

export function classifyLoss(cpLoss: number): 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' {
  if (cpLoss < 10) return 'best'
  if (cpLoss < 25) return 'excellent'
  if (cpLoss < 50) return 'good'
  if (cpLoss < 100) return 'inaccuracy'
  if (cpLoss < 200) return 'mistake'
  return 'blunder'
}

export function detectPhase(moveNumber: number, fen: string): 'opening' | 'middlegame' | 'endgame' {
  if (moveNumber <= 10) return 'opening'

  // Count pieces on board from FEN
  const piecePart = fen.split(' ')[0]
  let pieceCount = 0
  let hasQueens = false
  for (const ch of piecePart) {
    if (/[prnbqkPRNBQK]/.test(ch)) {
      pieceCount++
      if (ch === 'q' || ch === 'Q') hasQueens = true
    }
  }

  if (moveNumber <= 20) return 'opening'
  if (!hasQueens || pieceCount <= 12) return 'endgame'
  return 'middlegame'
}

// Normalize eval to always be from White's perspective (centipawns)
export function evalFromWhite(evalCp: number, colorToMove: 'white' | 'black'): number {
  return colorToMove === 'white' ? evalCp : -evalCp
}
