/** Downscale + JPEG-encode an image file so it can live inside content.json. */
export function fileToDataUrl(file: File, maxSide = 1400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Not a readable image'))
    }
    img.src = url
  })
}

/** Re-encode until the file fits the server's upload cap, shrinking quality first and then size. */
export async function compressToBlob(file: File, maxBytes = 650_000): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Not a readable image')); i.src = url })
    for (const side of [1600, 1280, 1000, 800, 600]) {
      const s = Math.min(1, side / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      for (const q of [0.82, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', q))
        if (blob && blob.size <= maxBytes) return blob
      }
    }
    throw new Error('That photo is too large even after compression.')
  } finally { URL.revokeObjectURL(url) }
}
