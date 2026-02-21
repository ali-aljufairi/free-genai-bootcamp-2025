"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface FluidVisualizationProps {
    isActive: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    size?: number;
}

export function FluidVisualization({
    isActive,
    isListening,
    isSpeaking,
    size = 300,
}: FluidVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        let animationFrameId = 0;
        let particles: Array<{
            x: number;
            y: number;
            radius: number;
            color: string;
            vx: number;
            vy: number;
            life: number;
            maxLife: number;
        }> = [];

        const createParticles = () => {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            if (isActive && particles.length < 100) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30 + 20;
                const speed = Math.random() * 0.5 + 0.2;

                let color = `rgba(150, 220, 255, ${Math.random() * 0.3 + 0.2})`;
                if (isSpeaking) {
                    color = `rgba(100, 180, 255, ${Math.random() * 0.3 + 0.2})`;
                } else if (isListening) {
                    color = `rgba(120, 200, 255, ${Math.random() * 0.3 + 0.2})`;
                }

                particles.push({
                    x: centerX + Math.cos(angle) * distance,
                    y: centerY + Math.sin(angle) * distance,
                    radius: Math.random() * 8 + 2,
                    color,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0,
                    maxLife: Math.random() * 100 + 50,
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const gradient = ctx.createRadialGradient(
                canvas.width / 2,
                canvas.height / 2,
                0,
                canvas.width / 2,
                canvas.height / 2,
                canvas.width / 2,
            );

            if (isSpeaking) {
                gradient.addColorStop(0, "rgba(220, 240, 255, 0.8)");
                gradient.addColorStop(0.5, "rgba(100, 180, 255, 0.4)");
                gradient.addColorStop(1, "rgba(50, 120, 220, 0)");
            } else if (isListening) {
                gradient.addColorStop(0, "rgba(230, 245, 255, 0.8)");
                gradient.addColorStop(0.5, "rgba(120, 200, 255, 0.4)");
                gradient.addColorStop(1, "rgba(70, 140, 230, 0)");
            } else {
                gradient.addColorStop(0, "rgba(240, 250, 255, 0.7)");
                gradient.addColorStop(0.5, "rgba(150, 220, 255, 0.3)");
                gradient.addColorStop(1, "rgba(100, 160, 240, 0)");
            }

            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 10, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            if (isActive) {
                createParticles();
            }

            particles = particles.filter((particle) => particle.life < particle.maxLife);

            particles.forEach((particle) => {
                particle.life += 1;
                particle.x += particle.vx;
                particle.y += particle.vy;

                const opacity = 1 - particle.life / particle.maxLife;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${opacity})`);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeCanvas = () => {
            const canvasSize = Math.min(size, window.innerWidth - 40);
            canvas.width = canvasSize;
            canvas.height = canvasSize;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        animate();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isActive, isListening, isSpeaking, size]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isActive ? 1 : 0.7,
                scale: isActive ? 1 : 0.9,
            }}
            transition={{ duration: 0.5 }}
            className="relative flex items-center justify-center"
        >
            <canvas
                ref={canvasRef}
                className="rounded-full"
                style={{
                    filter: `blur(${isActive ? 4 : 2}px)`,
                    transition: "filter 0.5s ease",
                }}
            />
        </motion.div>
    );
}
