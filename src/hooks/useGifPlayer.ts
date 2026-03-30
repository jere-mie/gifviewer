import { useEffect, useRef, useCallback } from 'react'
import { useInterval } from '@/hooks/useInterval'
import type { GifData } from '@/hooks/useGifParser'

interface UseGifPlayerProps {
  gifData: GifData | null
  currentFrame: number
  isPlaying: boolean
  onFrameChange: (frame: number) => void
  playbackSpeed?: number
  zoom?: number
  pan?: { x: number; y: number }
}

export function useGifPlayer({
  gifData,
  currentFrame,
  isPlaying,
  onFrameChange,
  playbackSpeed = 1,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: UseGifPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Scratch canvas holds each frame at native GIF resolution
  const scratchRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !gifData) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (cssW === 0 || cssH === 0) return

    // Size the buffer to physical pixels
    const bufW = Math.round(cssW * dpr)
    const bufH = Math.round(cssH * dpr)
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW
      canvas.height = bufH
    }

    // Blit current frame into the scratch canvas at native GIF size
    const scratch = scratchRef.current
    if (scratch.width !== gifData.width || scratch.height !== gifData.height) {
      scratch.width = gifData.width
      scratch.height = gifData.height
    }
    const sctx = scratch.getContext('2d')!
    sctx.putImageData(gifData.frames[currentFrame].imageData, 0, 0)

    // Compute scale: object-fit contain at zoom level
    const fitScale = Math.min(cssW / gifData.width, cssH / gifData.height)
    const drawScale = fitScale * zoom

    // Draw position: centre of buffer + pan offset (pan is in CSS pixels)
    const drawW = gifData.width * drawScale * dpr
    const drawH = gifData.height * drawScale * dpr
    const cx = bufW / 2 + pan.x * dpr
    const cy = bufH / 2 + pan.y * dpr

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, bufW, bufH)
    // Smooth downscaling (fit view); nearest-neighbour when zoomed in (upscaling)
    if (drawScale >= 1) {
      ctx.imageSmoothingEnabled = false
    } else {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }
    ctx.drawImage(scratch, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
  }, [gifData, currentFrame, zoom, pan])

  // Redraw whenever frame, zoom, or pan changes
  useEffect(() => {
    drawFrame()
  }, [drawFrame])

  // Redraw when the canvas element resizes (e.g. window resize, panel resize)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => drawFrame())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [drawFrame])

  // Playback interval
  const advanceFrame = useCallback(() => {
    if (!gifData) return
    onFrameChange((currentFrame + 1) % gifData.frames.length)
  }, [gifData, currentFrame, onFrameChange])

  const rawDelay = gifData?.frames[currentFrame]?.delay ?? 100
  const effectiveDelay = Math.max(16, rawDelay / playbackSpeed)

  useInterval(advanceFrame, isPlaying ? effectiveDelay : null)

  return { canvasRef }
}
