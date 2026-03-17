'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function PixelDissolveLoader() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const panels = el.querySelectorAll('.panel');

    const tl = gsap.timeline({ delay: 0.2 });

    // Panels move diagonally — top-left to bottom-right (following the -32deg angle)
    tl.to(panels, {
      x: '110vw',
      y: '-110vh',
      duration: 1,
      ease: 'power3.inOut',
      stagger: {
        amount: 0.4,
        from: 'end',
      },
    });

    tl.to(el, { opacity: 0, duration: 0.1 }, '-=0.1');

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="panel"
          style={{
            position: 'absolute',
            left: `${i * 15 - 10}%`,
            top: '-20%',
            width: '18%',
            height: '160%',
            transform: 'rotate(-32deg)',
            transformOrigin: 'center center',
            background: i % 2 === 0
              ? 'linear-gradient(180deg, #0a3d8f 0%, #1565c0 50%, #0a3d8f 100%)'
              : 'linear-gradient(180deg, #1565c0 0%, #1976d2 50%, #1565c0 100%)',
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
