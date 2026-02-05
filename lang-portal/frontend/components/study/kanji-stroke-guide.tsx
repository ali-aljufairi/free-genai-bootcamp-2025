"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, RotateCcw, Eye, EyeOff } from 'lucide-react'

interface KanjiStrokeGuideProps {
    svgData: string | null
    strokeCount?: number
    onStrokeComplete?: (strokeIndex: number) => void
    showGuide?: boolean
    onToggleGuide?: (show: boolean) => void
    isDrawing?: boolean
}

export function KanjiStrokeGuide({ svgData, strokeCount, onStrokeComplete, showGuide: externalShowGuide, onToggleGuide, isDrawing = false }: KanjiStrokeGuideProps) {
    const [currentStroke, setCurrentStroke] = useState(0) // Start at 0 for first stroke
    const [isPlaying, setIsPlaying] = useState(true) // Auto-play by default
    const [internalShowGuide, setInternalShowGuide] = useState(true)
    const [strokeSvgs, setStrokeSvgs] = useState<string[]>([])
    const animationRef = useRef<NodeJS.Timeout | null>(null)

    // Use external state if provided, otherwise use internal
    const showGuide = externalShowGuide !== undefined ? externalShowGuide : internalShowGuide
    const setShowGuide = onToggleGuide || setInternalShowGuide

    // Parse SVG and extract individual strokes
    useEffect(() => {
        if (!svgData) {
            setStrokeSvgs([])
            return
        }

        try {
            // Fix namespace issues for KanjiVG SVGs by adding the kvg namespace
            let fixedSvgData = svgData
            if (svgData.includes('kvg:') && !svgData.includes('xmlns:kvg')) {
                fixedSvgData = svgData.replace(
                    /<svg([^>]*)>/,
                    '<svg$1 xmlns:kvg="http://kanjivg.tagaini.net">'
                )
            }

            const parser = new DOMParser()
            let svgDoc = parser.parseFromString(fixedSvgData, 'image/svg+xml')
            let svgElement = svgDoc.documentElement

            const parseError = svgDoc.querySelector('parsererror')
            if (parseError) {
                console.warn('SVG parsing error, attempting to fix namespace issues:', parseError.textContent)
                try {
                    const cleanedSvg = svgData.replace(/kvg:/g, '').replace(/xmlns:kvg="[^"]*"/g, '')
                    svgDoc = parser.parseFromString(cleanedSvg, 'image/svg+xml')
                    svgElement = svgDoc.documentElement
                    const cleanedError = svgDoc.querySelector('parsererror')
                    if (cleanedError) {
                        setStrokeSvgs([])
                        return
                    }
                } catch (cleanError) {
                    console.warn('Failed to clean SVG:', cleanError)
                    setStrokeSvgs([])
                    return
                }
            }

            if (!svgElement || svgElement.tagName !== 'svg') {
                setStrokeSvgs([])
                return
            }

            if (!svgElement.getAttribute('viewBox')) {
                const width = svgElement.getAttribute('width') || '109'
                const height = svgElement.getAttribute('height') || '109'
                svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`)
            }
            svgElement.setAttribute('width', '300')
            svgElement.setAttribute('height', '300')
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
            svgElement.setAttribute('style', 'display: block;')

            const svgClone = svgElement.cloneNode(true) as SVGSVGElement
            const clonePaths = Array.from(svgClone.querySelectorAll('path'))

            if (clonePaths.length === 0) {
                console.warn('No path elements found in SVG, but SVG data exists:', svgData.substring(0, 100))
                setStrokeSvgs([])
                return
            }

            const svgs: string[] = []
            for (let strokeIndex = 0; strokeIndex < clonePaths.length; strokeIndex += 1) {
                clonePaths.forEach((path, index) => {
                    if (index <= strokeIndex) {
                        if (index === strokeIndex) {
                            path.setAttribute('stroke', '#3b82f6')
                            path.setAttribute('stroke-width', '3')
                            path.setAttribute('opacity', '1')
                        } else {
                            path.setAttribute('stroke', '#94a3b8')
                            path.setAttribute('stroke-width', '2')
                            path.setAttribute('opacity', '0.6')
                        }
                    } else {
                        path.setAttribute('opacity', '0')
                    }
                })
                svgs.push(svgClone.outerHTML)
            }

            setStrokeSvgs(svgs)
            setCurrentStroke(0)
            setIsPlaying(true)
        } catch (error) {
            console.error('Error parsing SVG:', error, 'SVG data:', svgData?.substring(0, 200))
            setStrokeSvgs([])
        }
    }, [svgData])

    // Animation effect - loops continuously until stopped, then user can step manually
    useEffect(() => {
        if (showGuide && !isDrawing && isPlaying && strokeSvgs.length > 0) {
            animationRef.current = setInterval(() => {
                setCurrentStroke(prev => {
                    const next = prev + 1
                    if (next >= strokeSvgs.length) {
                        // Loop back to the beginning instead of stopping
                        if (onStrokeComplete) {
                            onStrokeComplete(0)
                        }
                        return 0
                    }
                    if (onStrokeComplete) {
                        onStrokeComplete(next)
                    }
                    return next
                })
            }, 1000) // Show each stroke for 1 second
        } else {
            if (animationRef.current) {
                clearInterval(animationRef.current)
                animationRef.current = null
            }
            // When paused, stay at current stroke (user can step manually)
        }

        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current)
            }
        }
    }, [showGuide, isDrawing, isPlaying, strokeSvgs.length, onStrokeComplete])

    const handlePlay = () => {
        // Resume continuous looping from current position
        setIsPlaying(true)
    }

    const handlePause = () => {
        setIsPlaying(false)
    }

    const handleNext = () => {
        if (currentStroke < strokeSvgs.length - 1) {
            const next = currentStroke + 1
            setCurrentStroke(next)
            if (onStrokeComplete) {
                onStrokeComplete(next)
            }
        }
    }

    const handleReset = () => {
        setCurrentStroke(0)
        setIsPlaying(false)
    }

    if (!svgData) {
        return (
            <div className="w-full h-[300px] border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No stroke guide available</p>
            </div>
        )
    }

    if (strokeSvgs.length === 0) {
        // SVG exists but couldn't parse paths - try to display raw SVG
        return (
            <div className="w-full h-[300px] border-2 border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden flex items-center justify-center p-4 bg-white dark:bg-gray-900">
                <div
                    dangerouslySetInnerHTML={{ __html: svgData }}
                    className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:object-contain"
                />
            </div>
        )
    }

    const safeStrokeIndex = Math.min(currentStroke, strokeSvgs.length - 1)
    const modifiedSvg = strokeSvgs[safeStrokeIndex] || svgData

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                {showGuide && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Stroke {safeStrokeIndex + 1} of {strokeSvgs.length}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleReset}
                            disabled={safeStrokeIndex === 0}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={isPlaying ? handlePause : handlePlay}
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNext}
                            disabled={safeStrokeIndex >= strokeSvgs.length - 1}
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {showGuide && (
                <div className="w-full h-[300px] flex items-center justify-center">
                    <div
                        dangerouslySetInnerHTML={{ __html: modifiedSvg }}
                        className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full [&_svg]:max-h-full"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                </div>
            )}
        </div>
    )
}
