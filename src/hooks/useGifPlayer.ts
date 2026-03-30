import { useEffect, useRef, useCallback } from 'react'
import { useInterval } from '@/hooks/useInterval'
import type { GifData } from '@/hooks/useGifParser'

interface UseGifPlayerProps {
  gifData: GifData | null
  currentFrame: number
  isPlaying: boolean
  onFrameChange: (frame: number) => void
  playbackSpeed?: number
}

export function useGifPlayer({
  gifData,
  currentFrame,
  isPlaying,
  onFrameChange,
  playbackSpeed = 1,
}: UseGifPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw current frame to canvas
  useEffect(() => {
    if (!gifData || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, gifData.width, gifData.height)
    ctx.putImageData(gifData.frames[currentFrame].imageData, 0, 0)
  }, [gifData, currentFrame])

  const advanceFrame = useCallback(() => {
    if (!gifData) return
    const next = (currentFrame + 1) % gifData.frames.length
    onFrameChange(next)
  }, [gifData, currentFrame, onFrameChange])

  const rawDelay = gifData?.frames[currentFrame]?.delay ?? 100
  const effectiveDelay = Math.max(16, rawDelay / playbackSpeed)

  useInterval(advanceFrame, isPlaying ? effectiveDelay : null)

  return { canvasRef }
}
