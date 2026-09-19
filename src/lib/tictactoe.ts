export type Cell = 'X' | 'O' | null
export type Board = Cell[]
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

export function winner(b: Board): 'X' | 'O' | 'draw' | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  return b.every(Boolean) ? 'draw' : null
}
export function winLine(b: Board): number[] | null {
  for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return l
  return null
}
function minimax(b: Board, turn: 'X' | 'O', depth: number): number {
  const w = winner(b)
  if (w === 'O') return 10 - depth
  if (w === 'X') return depth - 10
  if (w === 'draw') return 0
  let best = turn === 'O' ? -Infinity : Infinity
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = turn
    const s = minimax(b, turn === 'O' ? 'X' : 'O', depth + 1)
    b[i] = null
    best = turn === 'O' ? Math.max(best, s) : Math.min(best, s)
  }
  return best
}
/** Best move for O (the AI). Assumes at least one empty cell. */
export function bestMove(board: Board): number {
  const b = [...board]
  let bestScore = -Infinity
  let move = -1
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = 'O'
    const s = minimax(b, 'X', 1)
    b[i] = null
    if (s > bestScore) { bestScore = s; move = i }
  }
  return move
}
