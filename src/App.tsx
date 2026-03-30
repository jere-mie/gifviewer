import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Upload, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useGifParser } from '@/hooks/useGifParser'
import { useGifPlayer } from '@/hooks/useGifPlayer'
import { cn } from '@/lib/utils'

function GithubIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

type ExportFormat = 'webp' | 'png' | 'jpeg'
const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const

export default function App() {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webp')
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isActivePanning, setIsActivePanning] = useState(false)

  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { gifData, loading, error, parseFile, reset } = useGifParser()
  const { canvasRef } = useGifPlayer({
    gifData,
    currentFrame,
    isPlaying,
    onFrameChange: setCurrentFrame,
    playbackSpeed,
  })

  // Reset state on new GIF
  useEffect(() => {
    setCurrentFrame(0)
    setIsPlaying(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [gifData])

  // Keyboard shortcuts
  useEffect(() => {
    if (!gifData) return
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying((p) => !p)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIsPlaying(false)
        setCurrentFrame((f) => (f - 1 + gifData.frames.length) % gifData.frames.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIsPlaying(false)
        setCurrentFrame((f) => (f + 1) % gifData.frames.length)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gifData])

  // Wheel zoom toward cursor
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container || !gifData) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const dx = e.clientX - rect.left - rect.width / 2
      const dy = e.clientY - rect.top - rect.height / 2
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      setZoom((prevZoom) => {
        const newZoom = Math.min(16, Math.max(1, prevZoom * factor))
        const ratio = newZoom / prevZoom
        setPan((p) =>
          newZoom <= 1
            ? { x: 0, y: 0 }
            : { x: dx * (1 - ratio) + p.x * ratio, y: dy * (1 - ratio) + p.y * ratio }
        )
        return newZoom
      })
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [gifData])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return
      setIsActivePanning(true)
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
      e.preventDefault()
    },
    [zoom, pan]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isActivePanning) return
    setPan({
      x: panStart.current.px + e.clientX - panStart.current.mx,
      y: panStart.current.py + e.clientY - panStart.current.my,
    })
  }, [isActivePanning])

  const stopPanning = useCallback(() => setIsActivePanning(false), [])

  // File handling
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) return
      parseFile(file)
    },
    [parseFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleClose = () => {
    reset()
    setCurrentFrame(0)
    setIsPlaying(false)
  }

  const handlePrevFrame = () => {
    if (!gifData) return
    setIsPlaying(false)
    setCurrentFrame((f) => (f - 1 + gifData.frames.length) % gifData.frames.length)
  }

  const handleNextFrame = () => {
    if (!gifData) return
    setIsPlaying(false)
    setCurrentFrame((f) => (f + 1) % gifData.frames.length)
  }

  const handleSliderChange = (value: number[]) => {
    setIsPlaying(false)
    setCurrentFrame(value[0])
  }

  const handleExport = () => {
    if (!gifData) return
    const canvas = document.createElement('canvas')
    canvas.width = gifData.width
    canvas.height = gifData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(gifData.frames[currentFrame].imageData, 0, 0)
    const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : `image/${exportFormat}`
    const quality = exportFormat === 'jpeg' ? 0.95 : 1.0
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `frame-${String(currentFrame + 1).padStart(3, '0')}.${exportFormat}`
        a.click()
        URL.revokeObjectURL(url)
      },
      mimeType,
      quality
    )
  }

  const totalFrames = gifData?.frames.length ?? 0
  const rawDelay = gifData?.frames[currentFrame]?.delay ?? 0
  const effectiveFps =
    rawDelay > 0 ? ((1000 / rawDelay) * playbackSpeed).toFixed(1) : '-'

  const cursorClass =
    zoom > 1 ? (isActivePanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-gray-100 flex flex-col">
      {/* Header - only visible when no GIF is loaded */}
      {!gifData && !loading && (
        <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎞️</span>
            <h1 className="text-base font-bold tracking-tight text-white">gifviewer</h1>
          </div>
          <a
            href="https://github.com/jere-mie/gifviewer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="View on GitHub"
          >
            <GithubIcon size={20} />
          </a>
        </header>
      )}

      {/* Empty state */}
      {!gifData && !loading && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full max-w-lg border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors py-14 px-8 text-center',
              isDragging
                ? 'border-indigo-400 bg-indigo-950/40'
                : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
            )}
          >
            <Upload size={36} className="text-gray-500" />
            <div>
              <p className="text-lg font-medium text-gray-200">Drop a GIF file here</p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Space to play/pause · ← → to step · scroll to zoom · drag to pan
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gif,image/gif"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {error && <p className="text-red-400 text-sm">Error: {error}</p>}

          <p className="text-sm text-gray-600">
            Need to record a GIF?{' '}
            <a
              href="https://gifcap.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Try gifcap.dev
            </a>
          </p>
        </main>
      )}

      {/* Loading */}
      {loading && (
        <main className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Parsing GIF...</p>
        </main>
      )}

      {/* Viewer - canvas fills all available space */}
      {gifData && (
        <>
          {/* Canvas stage */}
          <div
            ref={canvasContainerRef}
            className={cn('flex-1 overflow-hidden relative select-none', cursorClass)}
            style={{
              backgroundImage:
                'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)',
              backgroundSize: '20px 20px',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopPanning}
            onMouseLeave={stopPanning}
            onDoubleClick={resetZoom}
          >
            {/* Centred + transformed canvas wrapper */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={gifData.width}
                  height={gifData.height}
                  style={{
                    imageRendering: 'pixelated',
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                />
              </div>
            </div>

            {/* Overlay: zoom badge + close */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-auto">
              {zoom > 1.05 && (
                <button
                  onClick={resetZoom}
                  className="bg-gray-900/85 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md px-2 py-0.5 text-xs transition-colors"
                >
                  {zoom.toFixed(1)}× · reset
                </button>
              )}
              <button
                onClick={handleClose}
                className="bg-gray-900/85 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full p-1.5 transition-colors"
                aria-label="Close GIF"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Controls strip */}
          <div className="shrink-0 bg-gray-900/95 border-t border-gray-800 px-3 pt-2 pb-2 flex flex-col gap-1.5">
            {/* Timeline row */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 tabular-nums w-7 text-right shrink-0">
                {currentFrame + 1}
              </span>
              <Slider
                min={0}
                max={totalFrames - 1}
                step={1}
                value={[currentFrame]}
                onValueChange={handleSliderChange}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 tabular-nums w-7 shrink-0">
                {totalFrames}
              </span>
              <span className="text-xs text-gray-600 hidden sm:inline shrink-0 ml-1">
                {gifData.width}×{gifData.height} · {effectiveFps} fps
              </span>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Playback */}
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevFrame}
                  aria-label="Previous frame"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <SkipBack size={14} />
                </Button>
                <Button
                  size="icon"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="h-9 w-9 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextFrame}
                  aria-label="Next frame"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <SkipForward size={14} />
                </Button>
              </div>

              <span className="text-gray-700 text-sm hidden sm:inline">|</span>

              {/* Speed */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-600 hidden sm:inline">Speed</span>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium transition-colors tabular-nums',
                      playbackSpeed === s
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1 min-w-0" />

              {/* Export */}
              <div className="flex items-center gap-1 shrink-0">
                {(['webp', 'png', 'jpeg'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium transition-colors border',
                      exportFormat === fmt
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    )}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
                <Button
                  onClick={handleExport}
                  className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white gap-1 text-xs"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer - always visible, very compact */}
      <footer className="shrink-0 border-t border-gray-800 px-3 py-1 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://github.com/jere-mie/gifviewer"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <GithubIcon size={12} />
            GitHub
          </a>
          <span>·</span>
          <span>MIT</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Browser-only, no uploads</span>
        </div>
        <a
          href="https://github.com/jere-mie"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400 transition-colors"
        >
          Made by Jeremie Bornais
        </a>
      </footer>
    </div>
  )
}
