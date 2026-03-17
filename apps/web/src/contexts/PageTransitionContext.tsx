'use client';

import { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';

interface PageTransitionContextType {
  navigateTo: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAnimating = useRef(false);

  const navigateTo = useCallback((href: string) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const root = document.querySelector('.page-transition-root');
    if (!root) {
      router.push(href);
      isAnimating.current = false;
      return;
    }

    // Remove any existing overlay
    const existing = root.querySelector('.page-transition-overlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', zIndex: '50',
      pointerEvents: 'none', overflow: 'hidden',
    });

    for (let i = 0; i < 18; i++) {
      const panel = document.createElement('div');
      panel.className = 'page-panel';
      Object.assign(panel.style, {
        position: 'absolute',
        left: `${i * 9 - 30}%`,
        top: '-60%',
        width: '12%',
        height: '300%',
        transform: 'rotate(-32deg)',
        transformOrigin: 'center center',
        background: i % 2 === 0
          ? 'linear-gradient(180deg, #1670a0 0%, #1a85b5 50%, #1670a0 100%)'
          : 'linear-gradient(180deg, #1a85b5 0%, #2098c8 50%, #1a85b5 100%)',
        willChange: 'transform',
      });
      overlay.appendChild(panel);
    }

    root.appendChild(overlay);

    const panels = overlay.querySelectorAll('.page-panel');

    // Start off-screen bottom-left
    gsap.set(panels, { xPercent: -120, yPercent: 120 });

    const tl = gsap.timeline();

    // Sweep in — covers the content
    tl.to(panels, {
      xPercent: 0, yPercent: 0,
      duration: 0.8,
      ease: 'power3.out',
      stagger: { amount: 0.3, from: 'start' },
    });

    // Navigate while covered
    tl.call(() => {
      router.push(href);
    });

    // Sweep out — reveals new page
    tl.to(panels, {
      xPercent: 120, yPercent: -120,
      duration: 0.8,
      ease: 'power3.in',
      stagger: { amount: 0.3, from: 'end' },
    }, '+=0.3');

    // Cleanup
    tl.call(() => {
      overlay.remove();
      isAnimating.current = false;
    });

  }, [router]);

  return (
    <PageTransitionContext.Provider value={{ navigateTo }}>
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider');
  }
  return context;
}
