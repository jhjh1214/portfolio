/** Returns a feeder that reports true once the trailing keys equal `seq`. */
export function createSequenceMatcher(seq: string[], caseInsensitive = true) {
  const norm = (s: string) => (caseInsensitive ? s.toLowerCase() : s)
  const target = seq.map(norm)
  let buf: string[] = []
  return (key: string) => {
    buf.push(norm(key))
    if (buf.length > target.length) buf = buf.slice(-target.length)
    const hit = buf.length === target.length && buf.every((k, i) => k === target[i])
    if (hit) buf = []
    return hit
  }
}
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
export const word = (w: string) => w.split('')
