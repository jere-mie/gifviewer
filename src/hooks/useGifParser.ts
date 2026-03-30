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

export function useGifParser() {
  const [gifData, setGifData] = useState<GifData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setGifData(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const gif = parseGIF(arrayBuffer)
      const rawFrames = decompressFrames(gif, true)

      if (!rawFrames.length) {
        throw new Error('No frames found in GIF')
      }

      const { width, height } = rawFrames[0].dims

      // We need a persistent canvas to handle disposal methods correctly
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!

      const frames: GifFrame[] = []

      for (const frame of rawFrames) {
        const { dims, patch, delay, disposalType } = frame

        // Save previous frame state for disposal
        const prevImageData = ctx.getImageData(0, 0, width, height)

        // If disposal is "restore to background" (2), clear the area first
        if (disposalType === 2) {
          ctx.clearRect(dims.left, dims.top, dims.width, dims.height)
        }

        // Draw the patch onto a temporary ImageData
        const patchData = new ImageData(
          new Uint8ClampedArray(patch),
          dims.width,
          dims.height
        )
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = dims.width
        tempCanvas.height = dims.height
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(patchData, 0, 0)

        ctx.drawImage(tempCanvas, dims.left, dims.top)

        // Capture the full frame
        const frameImageData = ctx.getImageData(0, 0, width, height)
        frames.push({
          imageData: frameImageData,
          delay: Math.max(delay || 100, 20), // default 100ms, min 20ms
        })

        // Handle disposal: restore previous if type 3
        if (disposalType === 3) {
          ctx.putImageData(prevImageData, 0, 0)
        }
      }

      setGifData({ frames, width, height })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse GIF')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setGifData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { gifData, loading, error, parseFile, reset }
}
