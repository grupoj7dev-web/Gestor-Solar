import React, { useEffect, useRef } from 'react';

export function ParticleAnimation({ isListening = false }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const particlesRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const particles = particlesRef.current;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = canvas.width / 2;
                this.y = canvas.height / 2;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.radius = Math.random() * 3 + 1;
                this.life = 1;
                this.decay = Math.random() * 0.01 + 0.005;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;

                // Add some gravity
                this.vy += 0.02;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas.width) this.vx *= -0.8;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -0.8;

                // Reset if dead
                if (this.life <= 0) {
                    this.reset();
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

                // Color based on listening state
                const hue = isListening ? 280 : 200; // Purple when listening, blue otherwise
                const alpha = this.life * 0.8;
                ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
                ctx.fill();

                // Add glow effect
                ctx.shadowBlur = isListening ? 20 : 10;
                ctx.shadowColor = `hsla(${hue}, 70%, 60%, ${alpha})`;
            }
        }

        // Initialize particles
        const particleCount = isListening ? 150 : 100;
        while (particles.length < particleCount) {
            particles.push(new Particle());
        }
        while (particles.length > particleCount) {
            particles.pop();
        }

        // Animation loop
        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            // Draw connections between nearby particles
            ctx.strokeStyle = isListening ? 'rgba(147, 51, 234, 0.2)' : 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 1;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.globalAlpha = (1 - distance / 100) * 0.3;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isListening]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: 'radial-gradient(circle at center, #1a1a2e 0%, #0f0f1e 100%)' }}
        />
    );
}
