"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, RotateCcw, Eye, EyeOff } from 'lucide-react'

interface KanjiStrokeGuideProps {
    svgData: string | null
    strokeCount?: number
    onStrokeComplete?: (strokeIndex: number) => void
}

export function KanjiStrokeGuide({ svgData, strokeCount, onStrokeComplete }: KanjiStrokeGuideProps) {
    const [currentStroke, setCurrentStroke] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showGuide, setShowGuide] = useState(true)
    const [displayedStrokes, setDisplayedStrokes] = useState<string[]>([])
    const animationRef = useRef<NodeJS.Timeout | null>(null)

    // Parse SVG and extract individual strokes
    useEffect(() => {
        if (!svgData) {
            setDisplayedStrokes([])
            return
        }

        try {
            // Fix namespace issues for KanjiVG SVGs by adding the kvg namespace
            let fixedSvgData = svgData
            if (svgData.includes('kvg:') && !svgData.includes('xmlns:kvg')) {
                // Add kvg namespace if missing
                fixedSvgData = svgData.replace(
                    /<svg([^>]*)>/,
                    '<svg$1 xmlns:kvg="http://kanjivg.tagaini.net">'
                )
            }

            // Parse the SVG string
            const parser = new DOMParser()
            const svgDoc = parser.parseFromString(fixedSvgData, 'image/svg+xml')
            const svgElement = svgDoc.documentElement

            // Check for parsing errors
            const parseError = svgDoc.querySelector('parsererror')
            if (parseError) {
                // Try to fix by removing kvg namespace attributes
                console.warn('SVG parsing error, attempting to fix namespace issues:', parseError.textContent)
                try {
                    // Remove kvg: prefixes from attributes
                    const cleanedSvg = svgData.replace(/kvg:/g, '').replace(/xmlns:kvg="[^"]*"/g, '')
                    const cleanedDoc = parser.parseFromString(cleanedSvg, 'image/svg+xml')
                    const cleanedError = cleanedDoc.querySelector('parsererror')
                    if (!cleanedError) {
                        // Successfully parsed after cleaning
                        const paths = Array.from(cleanedDoc.querySelectorAll('path'))
                        if (paths.length > 0) {
                            const strokePaths = paths.map(path => {
                                const pathClone = path.cloneNode(true) as SVGPathElement
                                return pathClone.outerHTML
                            })
                            setDisplayedStrokes(strokePaths)
                            setCurrentStroke(0)
                            return
                        }
                    }
                } catch (cleanError) {
                    console.warn('Failed to clean SVG:', cleanError)
                }
                setDisplayedStrokes([])
                return
            }

            // Extract all path elements (strokes)
            const paths = Array.from(svgElement.querySelectorAll('path'))

            if (paths.length === 0) {
                console.warn('No path elements found in SVG, but SVG data exists:', svgData.substring(0, 100))
                // Still set displayed strokes to empty so we can show raw SVG
                setDisplayedStrokes([])
                return
            }

            const strokePaths = paths.map(path => {
                const pathClone = path.cloneNode(true) as SVGPathElement
                // Set stroke color to highlight current stroke
                return pathClone.outerHTML
            })

            setDisplayedStrokes(strokePaths)
            setCurrentStroke(0)
        } catch (error) {
            console.error('Error parsing SVG:', error, 'SVG data:', svgData?.substring(0, 200))
            setDisplayedStrokes([])
        }
    }, [svgData])

    // Animation effect
    useEffect(() => {
        if (isPlaying && displayedStrokes.length > 0) {
            animationRef.current = setInterval(() => {
                setCurrentStroke(prev => {
                    const next = prev + 1
                    if (next >= displayedStrokes.length) {
                        setIsPlaying(false)
                        return prev
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
        }

        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current)
            }
        }
    }, [isPlaying, displayedStrokes.length, onStrokeComplete])

    const handlePlay = () => {
        if (currentStroke >= displayedStrokes.length - 1) {
            // Reset to beginning
            setCurrentStroke(0)
        }
        setIsPlaying(true)
    }

    const handlePause = () => {
        setIsPlaying(false)
    }

    const handleNext = () => {
        if (currentStroke < displayedStrokes.length - 1) {
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

    if (displayedStrokes.length === 0) {
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

    // Create SVG with strokes up to current stroke
    // Parse the original SVG and modify stroke colors
    let modifiedSvg = svgData
    try {
        // Fix namespace issues first
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

        // Check for parsing errors and try to fix
        const parseError = svgDoc.querySelector('parsererror')
        if (parseError) {
            // Try removing kvg namespace attributes
            const cleanedSvg = svgData.replace(/kvg:/g, '').replace(/xmlns:kvg="[^"]*"/g, '')
            svgDoc = parser.parseFromString(cleanedSvg, 'image/svg+xml')
            svgElement = svgDoc.documentElement
            const stillError = svgDoc.querySelector('parsererror')
            if (stillError) {
                // If still error, just use original SVG
                console.warn('Could not parse SVG, using original:', stillError.textContent)
                modifiedSvg = svgData
            }
        }

        // Only proceed if we have a valid SVG element
        if (svgElement && svgElement.tagName === 'svg') {
            // Ensure SVG has proper viewBox and dimensions
            if (!svgElement.getAttribute('viewBox')) {
                const width = svgElement.getAttribute('width') || '109'
                const height = svgElement.getAttribute('height') || '109'
                svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`)
            }
            svgElement.setAttribute('width', '100%')
            svgElement.setAttribute('height', '100%')
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
            svgElement.setAttribute('style', 'display: block;')

            const paths = Array.from(svgElement.querySelectorAll('path'))

            paths.forEach((path, index) => {
                const pathElement = path as SVGPathElement
                if (index <= currentStroke) {
                    // Highlight current stroke, dim previous ones
                    if (index === currentStroke) {
                        pathElement.setAttribute('stroke', '#3b82f6')
                        pathElement.setAttribute('stroke-width', '3')
                        pathElement.setAttribute('opacity', '1')
                    } else {
                        pathElement.setAttribute('stroke', '#94a3b8')
                        pathElement.setAttribute('stroke-width', '2')
                        pathElement.setAttribute('opacity', '0.6')
                    }
                } else {
                    // Hide future strokes by making them transparent
                    pathElement.setAttribute('opacity', '0')
                }
            })

            modifiedSvg = svgElement.outerHTML
        }
    } catch (error) {
        console.error('Error modifying SVG:', error)
        modifiedSvg = svgData
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGuide(!showGuide)}
                    >
                        {showGuide ? (
                            <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Hide Guide
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                Show Guide
                            </>
                        )}
                    </Button>
                </div>
                {showGuide && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Stroke {currentStroke + 1} of {displayedStrokes.length}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleReset}
                            disabled={currentStroke === 0}
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
                            disabled={currentStroke >= displayedStrokes.length - 1}
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {showGuide && (
                <div className="w-full h-[300px] border-2 border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden flex items-center justify-center p-4 bg-white dark:bg-gray-900">
                    <div
                        dangerouslySetInnerHTML={{ __html: modifiedSvg }}
                        className="w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:object-contain [&_svg]:w-auto [&_svg]:h-auto"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                    />
                </div>
            )}
        </div>
    )
}

