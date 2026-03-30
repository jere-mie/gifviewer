import { useState, useCallback } from 'react'
import { parseGIF, decompressFrames } from 'gifuct-js'

export interface GifFrame {
  imageData: ImageData
  delay: number // ms
}

export interface GifData {
  frames: GifFrame[]
  width: number
  height: number
}

const yield_ = () => new Promise<void>((r) => setTimeout(r, 0))

export function useGifParser() {
  const [gifData, setGifData] = useState<GifData | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File) => {
    setLoading(true)
    setProgress(0)
    setError(null)
    setGifData(null)

    // Yield once so React can render the loading state before we block
    await yield_()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const gif = parseGIF(arrayBuffer)
      // decompressFrames is synchronous and may block for large GIFs
      const rawFrames = decompressFrames(gif, true)

      if (!rawFrames.length) {
        throw new Error('No frames found in GIF')
      }

      const { width, height } = rawFrames[0].dims
      const total = rawFrames.length

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')!

      const frames: GifFrame[] = []

      for (let i = 0; i < total; i++) {
        const frame = rawFrames[i]
        const { dims, patch, delay, disposalType } = frame

        const prevImageData = ctx.getImageData(0, 0, width, height)

        if (disposalType === 2) {
          ctx.clearRect(dims.left, dims.top, dims.width, dims.height)
        }

        if (tempCanvas.width !== dims.width || tempCanvas.height !== dims.height) {
          tempCanvas.width = dims.width
          tempCanvas.height = dims.height
        }
        const patchData = new ImageData(new Uint8ClampedArray(patch), dims.width, dims.height)
        tempCtx.putImageData(patchData, 0, 0)
        ctx.drawImage(tempCanvas, dims.left, dims.top)

        frames.push({
          imageData: ctx.getImageData(0, 0, width, height),
          delay: Math.max(delay || 100, 20),
        })

        if (disposalType === 3) {
          ctx.putImageData(prevImageData, 0, 0)
        }

        // Yield every 4 frames to update progress UI
        if (i % 4 === 3 || i === total - 1) {
          setProgress((i + 1) / total)
          await yield_()
        }
      }

      setGifData({ frames, width, height })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse GIF')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [])

  const reset = useCallback(() => {
    setGifData(null)
    setError(null)
    setLoading(false)
    setProgress(0)
  }, [])

  return { gifData, loading, progress, error, parseFile, reset }
}
