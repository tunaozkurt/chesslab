import { spawn, ChildProcess } from 'child_process'
import path from 'path'

export interface StockfishResult {
  fen: string
  bestMove: string | null
  evalCp: number       // centipawn from side-to-move perspective
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

/**
 * Analyzes all positions in a game using a single Stockfish process.
 * Far faster than spawning a process per position — startup cost paid once.
 *
 * @param fens     Ordered list of FEN strings to analyze (fen_before per move + final fen_after)
 * @param movetime Milliseconds per position (default 100 ms — good balance of speed and accuracy)
 */
export async function analyzeGame(
  fens: string[],
  movetime = 100
): Promise<StockfishResult[]> {
  if (fens.length === 0) return []

  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn(process.execPath, [STOCKFISH_PATH], {
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    const results: StockfishResult[] = []
    let currentIndex = 0
    let currentBestEval = 0
    let currentBestPv: string | null = null
    let currentBestMove: string | null = null
    let settled = false
    let initialized = false

    // Total budget: 200 s (stays under Vercel's 300 s limit)
    const totalTimeout = setTimeout(() => {
      if (!settled) {
        settled = true
        proc.kill()
        // Fill remaining positions with zero eval so the route can still proceed
        while (results.length < fens.length) {
          results.push({ fen: fens[results.length], bestMove: null, evalCp: 0, pv: null })
        }
        resolve(results)
      }
    }, 200_000)

    function resetCurrent() {
      currentBestEval = 0
      currentBestPv = null
      currentBestMove = null
    }

    function sendNext() {
      if (currentIndex >= fens.length) {
        if (!settled) {
          settled = true
          clearTimeout(totalTimeout)
          proc.stdin!.write('quit\n')
          proc.kill()
          resolve(results)
        }
        return
      }
      resetCurrent()
      proc.stdin!.write(`position fen ${fens[currentIndex]}\n`)
      proc.stdin!.write(`go movetime ${movetime}\n`)
    }

    proc.stdout!.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed === 'uciok') {
          proc.stdin!.write('setoption name Hash value 16\n')
          proc.stdin!.write('isready\n')
          continue
        }

        if (trimmed === 'readyok' && !initialized) {
          initialized = true
          sendNext()
          continue
        }

        if (trimmed.startsWith('info') && (trimmed.includes('score cp') || trimmed.includes('score mate'))) {
          const parsed = parseInfoLine(trimmed)
          if (parsed) {
            currentBestEval = parsed.evalCp
            currentBestPv = parsed.pv
          }
          continue
        }

        if (trimmed.startsWith('bestmove')) {
          const m = trimmed.match(/bestmove (\S+)/)
          currentBestMove = m ? m[1] : null
          if (currentBestMove === '(none)') currentBestMove = null

          results.push({
            fen: fens[currentIndex],
            bestMove: currentBestMove,
            evalCp: currentBestEval,
            pv: currentBestPv,
          })

          currentIndex++
          sendNext()
        }
      }
    })

    proc.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(totalTimeout)
        reject(err)
      }
    })

    // Kick off UCI handshake — position/go commands follow after readyok
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

export function evalFromWhite(evalCp: number, colorToMove: 'white' | 'black'): number {
  return colorToMove === 'white' ? evalCp : -evalCp
}
