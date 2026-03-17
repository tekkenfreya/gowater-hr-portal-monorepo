'use client';

import { useRef, useEffect } from 'react';

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  alpha: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  speed: number;
  alpha: number;
}

interface Caustic {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  drift: number;
  alpha: number;
}

export default function WaterBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let animId = 0;

    const bubbles: Bubble[] = [];
    const ripples: Ripple[] = [];
    const caustics: Caustic[] = [];

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const r = parent.getBoundingClientRect();
      W = canvas!.width = r.width;
      H = canvas!.height = r.height;
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 30; i++) {
      bubbles.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 3.5 + 1,
        speed: Math.random() * 0.0003 + 0.00015,
        wobble: Math.random() * 100,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    for (let i = 0; i < 4; i++) {
      ripples.push({
        x: 0.25 + Math.random() * 0.5,
        y: 0.25 + Math.random() * 0.5,
        r: Math.random() * 0.15,
        maxR: 0.15 + Math.random() * 0.2,
        speed: 0.00015 + Math.random() * 0.0002,
        alpha: 0,
      });
    }

    for (let i = 0; i < 8; i++) {
      caustics.push({
        x: Math.random(), y: Math.random() * 0.4,
        w: 30 + Math.random() * 80,
        h: 4 + Math.random() * 8,
        speed: 0.2 + Math.random() * 0.5,
        drift: Math.random() * 100,
        alpha: Math.random() * 0.15 + 0.05,
      });
    }

    function draw(ts: number) {
      const t = ts * 0.001;
      ctx!.clearRect(0, 0, W, H);

      // Base — single smooth gradient, top to bottom only
      const grd = ctx!.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#2098c8');
      grd.addColorStop(0.5, '#1a85b5');
      grd.addColorStop(1, '#1670a0');
      ctx!.fillStyle = grd;
      ctx!.fillRect(0, 0, W, H);

      // Caustics
      for (let i = 0; i < caustics.length; i++) {
        const c = caustics[i];
        const cx = c.x * W + Math.sin(t * c.speed + c.drift) * 40;
        const cy = c.y * H + Math.cos(t * c.speed * 0.7 + c.drift) * 15;
        const shimmer = 0.5 + 0.5 * Math.sin(t * 1.5 + c.drift);
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(Math.sin(t * 0.3 + c.drift) * 0.15);
        ctx!.beginPath();
        ctx!.ellipse(0, 0, c.w * (0.8 + shimmer * 0.4), c.h, 0, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${c.alpha * shimmer})`;
        ctx!.fill();
        ctx!.restore();
      }



      // Ripples
      for (let i = 0; i < ripples.length; i++) {
        const rp = ripples[i];
        rp.r += rp.speed;
        if (rp.r < rp.maxR * 0.5) {
          rp.alpha = (rp.r / (rp.maxR * 0.5)) * 0.1;
        } else {
          rp.alpha = (1 - (rp.r - rp.maxR * 0.5) / (rp.maxR * 0.5)) * 0.1;
        }
        if (rp.r > rp.maxR) {
          rp.r = 0;
          rp.x = 0.25 + Math.random() * 0.5;
          rp.y = 0.25 + Math.random() * 0.5;
          rp.maxR = 0.15 + Math.random() * 0.2;
        }
        ctx!.beginPath();
        ctx!.arc(rp.x * W, rp.y * H, rp.r * Math.min(W, H), 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(160,230,255,${rp.alpha})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      // Bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed;
        if (b.y < -0.05) { b.y = 1.05; b.x = Math.random(); }
        const bx = b.x * W + Math.sin(t * 1.2 + b.wobble) * 10;
        const by = b.y * H;
        const shimmer = 0.5 + 0.5 * Math.sin(t * 2.5 + b.wobble);

        ctx!.beginPath();
        ctx!.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200,240,255,${b.alpha * shimmer})`;
        ctx!.fill();

        if (b.r > 1.5) {
          ctx!.beginPath();
          ctx!.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${b.alpha * shimmer * 0.5})`;
          ctx!.fill();
        }
      }

      // Top shine
      const topShine = ctx!.createRadialGradient(W * 0.75, 0, 0, W * 0.75, 0, H * 0.4);
      topShine.addColorStop(0, 'rgba(255,255,255,0.08)');
      topShine.addColorStop(0.5, 'rgba(200,240,255,0.03)');
      topShine.addColorStop(1, 'transparent');
      ctx!.fillStyle = topShine;
      ctx!.fillRect(0, 0, W, H * 0.5);

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}
