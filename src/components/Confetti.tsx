import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
    show: boolean;
    duration?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ show, duration = 3000 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (!show || !canvasRef.current) {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to full screen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Confetti particles
        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
            rotation: number;
            rotationSpeed: number;
            shape: 'rect' | 'circle';
        }> = [];

        // Mooie kleuren voor confetti
        const colors = [
            '#ff6b6b', // Rood
            '#4ecdc4', // Turquoise
            '#45b7d1', // Blauw
            '#f9ca24', // Geel
            '#f0932b', // Oranje
            '#eb4d4b', // Donkerrood
            '#6c5ce7', // Paars
            '#a29bfe', // Lichtpaars
            '#00d2d3', // Cyan
            '#ff9ff3', // Roze
        ];

        // Create particles from center/top
        const centerX = canvas.width / 2;
        const topY = 0;

        for (let i = 0; i < 200; i++) {
            const angle = (Math.PI * 2 * i) / 200 + Math.random() * 0.5;
            const speed = Math.random() * 5 + 3;
            
            particles.push({
                x: centerX + (Math.random() - 0.5) * 200,
                y: topY - Math.random() * 100,
                vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
                vy: Math.sin(angle) * speed + Math.random() * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                shape: Math.random() > 0.5 ? 'rect' : 'circle',
            });
        }

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed > duration) {
                // Fade out
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            // Clear canvas with slight fade for trail effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach((particle) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.rotation += particle.rotationSpeed;
                
                // Gravity effect
                particle.vy += 0.15;
                
                // Air resistance
                particle.vx *= 0.99;
                particle.vy *= 0.99;

                // Draw particle
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                
                // Fade out near end
                const fadeProgress = Math.min(1, elapsed / (duration * 0.8));
                const alpha = 1 - fadeProgress;
                
                if (particle.shape === 'circle') {
                    ctx.fillStyle = particle.color;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = particle.color;
                    ctx.globalAlpha = alpha;
                    ctx.fillRect(
                        -particle.size / 2,
                        -particle.size / 2,
                        particle.size,
                        particle.size
                    );
                }
                
                ctx.restore();
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [show, duration]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!show) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    );
};

