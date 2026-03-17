'use client';

import { useRef, useMemo, useEffect } from 'react';
import gsap from 'gsap';

interface P3LoadingScreenProps {
  onComplete: () => void;
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const ANGLE_DEG = -32;
const ANGLE_RAD = ANGLE_DEG * Math.PI / 180;
const STEP_X = 95;
const STEP_Y = STEP_X * Math.tan(-ANGLE_RAD);

interface DayData {
  date: number;
  day: typeof DAY_NAMES[number];
  isSunday: boolean;
  isCurrent: boolean;
  offset: number;
}

function getMoonPhase(dayOfMonth: number): number {
  return Math.abs(dayOfMonth % 8);
}

function MoonDot({
  phase,
  isActive,
  size,
  alpha,
}: {
  phase: number;
  isActive: boolean;
  size: number;
  alpha: number;
}) {
  const lightSide = phase % 2 === 0 ? '35%' : '65%';

  if (isActive) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="moon-active" cx="35%" cy="40%">
            <stop offset="48%" stopColor="#f5c800" />
            <stop offset="48%" stopColor="#1a1f2e" />
          </radialGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="url(#moon-active)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={3}
        />
      </svg>
    );
  }

  const lightColor = `rgba(220,220,220,${alpha})`;
  const darkColor = `rgba(90,90,90,${alpha})`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id={`moon-${phase}-${size}`} cx={lightSide} cy="40%">
          <stop offset="46%" stopColor={lightColor} />
          <stop offset="46%" stopColor={darkColor} />
        </radialGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 1}
        fill={`url(#moon-${phase}-${size})`}
      />
    </svg>
  );
}

function getSizeForDistance(dist: number, isCurrent: boolean): number {
  if (isCurrent) return 68;
  if (dist === 1) return 48;
  if (dist === 2) return 42;
  if (dist === 3) return 38;
  if (dist === 4) return 34;
  return 30;
}

function getAlphaForDistance(dist: number, isCurrent: boolean): number {
  if (isCurrent) return 1;
  return Math.max(0.25, 0.7 - dist * 0.08);
}

export default function P3LoadingScreen({ onComplete }: P3LoadingScreenProps) {
  const container = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const { currentYear, monthName, days } = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    const daysArray: DayData[] = [];
    for (let i = -5; i <= 5; i++) {
      const d = new Date(year, month, todayDate + i);
      daysArray.push({
        date: d.getDate(),
        day: DAY_NAMES[d.getDay()],
        isSunday: d.getDay() === 0,
        isCurrent: i === 0,
        offset: i,
      });
    }

    return {
      currentYear: year,
      monthName: MONTH_NAMES[month],
      monthNumber: month + 1,
      days: daysArray,
    };
  }, []);

  const curIdx = days.findIndex((d) => d.isCurrent);

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const cw = el.offsetWidth || 700;
    const ch = el.offsetHeight || 600;
    const midX = cw / 2;
    const midY = ch / 2;

    const dayEls = el.querySelectorAll<HTMLElement>('.p3d');
    dayEls.forEach((dayEl, i) => {
      const offset = i - curIdx;
      const px = midX + offset * STEP_X - 40;
      const py = midY - offset * STEP_Y;
      dayEl.style.left = `${Math.round(px)}px`;
      dayEl.style.top = `${Math.round(py)}px`;
    });

    const stripe = el.querySelector('.p3-stripe') as HTMLElement;
    const line = el.querySelector('.p3-line') as HTMLElement;
    const sYear = el.querySelector('.p3-stripe-year') as HTMLElement;
    const sNum = el.querySelector('.p3-stripe-num') as HTMLElement;
    const r1 = el.querySelector('.p3-ripple1') as HTMLElement;
    const r2 = el.querySelector('.p3-ripple2') as HTMLElement;
    const r3 = el.querySelector('.p3-ripple3') as HTMLElement;
    const dots = el.querySelectorAll('.p3dot');
    const ring = el.querySelector('.p3-ring') as HTMLElement | null;

    gsap.set(stripe, { opacity: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set(line, { opacity: 0 });
    gsap.set([sYear, sNum], { opacity: 0 });
    gsap.set(dayEls, { opacity: 0, x: -40, y: 20 });
    gsap.set(dots, { scale: 0 });
    gsap.set([r1, r2, r3], { scale: 0, opacity: 0 });
    if (ring) gsap.set(ring, { opacity: 0, scale: 0.6 });

    const tl = gsap.timeline();

    // 1. Day items cascade in first
    const sorted = gsap.utils.toArray(dayEls);

    tl.to(sorted, {
      opacity: 1, x: 0, y: 0,
      stagger: 0.08, duration: 0.5, ease: 'back.out(1.3)',
    });

    // 2. Moon dots pop in
    tl.to(dots, {
      scale: 1, stagger: 0.05, duration: 0.3, ease: 'back.out(2.5)',
    }, '-=0.6');

    // 3. Stripe fires fast when current day is highlighted
    tl.to(stripe, { clipPath: 'inset(0 0% 0 0)', duration: 2.5, ease: 'power3.out' }, curIdx * 0.08 + 0.8);

    // 4. Line fades in
    tl.to(line, { opacity: 1, duration: 0.8 }, '-=1.5');

    // 5. Year label fades in
    tl.to(sYear, { opacity: 1, duration: 0.8 }, '-=1.2');

    // 6. Month number fades in
    tl.to(sNum, { opacity: 1, duration: 1.0 }, '-=1.0');

    // 7. Ripple circles scale in
    tl.to(r1, { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.6');
    tl.to(r2, { scale: 1, opacity: 1, duration: 1.0, ease: 'power2.out' }, '-=0.5');
    tl.to(r3, { scale: 1, opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=0.6');

    // 8. Active ring pulses (longer, more repeats)
    if (ring) {
      tl.to(ring, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, '-=0.3');
      tl.to(ring, {
        opacity: 0.4, scale: 1.2, duration: 1.2,
        repeat: 3, yoyo: true, ease: 'sine.inOut',
      });
    }

    // Ripple pulse
    tl.to(r1, { scale: 1.3, opacity: 0, duration: 2, ease: 'sine.out' }, '-=3');
    tl.to(r2, { scale: 1.2, opacity: 0, duration: 2.5, ease: 'sine.out' }, '<0.3');
    tl.to(r3, { scale: 1.15, opacity: 0, duration: 3, ease: 'sine.out' }, '<0.3');

    // 9. Fade out everything
    tl.to(el, {
      opacity: 0, duration: 0.8, ease: 'power2.in',
      onComplete: () => onCompleteRef.current(),
    }, '+=0.5');

    return () => {
      tl.kill();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={container}
      role="status"
      aria-label="Loading dashboard"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#1a1f2e',
        overflow: 'hidden',
        fontFamily: "'Montserrat', 'Geist', sans-serif",
      }}
    >
      <span style={{
        position: 'absolute', width: 1, height: 1, overflow: 'hidden',
        clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap',
      }}>
        Loading...
      </span>

      {/* Blue stripe — horizontal band centered vertically */}
      <div
        className="p3-stripe"
        style={{
          position: 'absolute',
          width: '140%',
          height: 90,
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,61,143,0.3) 10%, #1565c0 30%, #1976d2 50%, #1565c0 70%, rgba(10,61,143,0.3) 90%, transparent 100%)',
          top: '50%',
          left: '-20%',
          marginTop: -45,
          transform: 'rotate(12deg)',
          transformOrigin: 'center center',
          boxShadow: '0 0 40px rgba(21,101,192,0.4), 0 0 80px rgba(25,118,210,0.2)',
          filter: 'blur(0.5px)',
        }}
      >
        {/* Ripple circles */}
        <div
          className="p3-ripple1"
          style={{
            position: 'absolute',
            width: 110, height: 110,
            border: '1.5px solid rgba(255,255,255,0.12)',
            borderRadius: '50%',
            top: '50%', left: '55%',
            transform: 'translate(-50%,-50%) scale(0)',
          }}
        />
        <div
          className="p3-ripple2"
          style={{
            position: 'absolute',
            width: 180, height: 180,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '50%',
            top: '50%', left: '55%',
            transform: 'translate(-50%,-50%) scale(0)',
          }}
        />
        <div
          className="p3-ripple3"
          style={{
            position: 'absolute',
            width: 270, height: 270,
            border: '1px solid rgba(255,255,255,0.035)',
            borderRadius: '50%',
            top: '50%', left: '55%',
            transform: 'translate(-50%,-50%) scale(0)',
          }}
        />

      </div>

      {/* Year + month label — outside stripe, top-left */}
      <div
        className="p3-stripe-year"
        style={{
          position: 'absolute',
          top: '15%', left: '5%',
          fontSize: 22, fontWeight: 700,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: 1,
          zIndex: 2,
        }}
      >
        {currentYear}
        <br />
        <span style={{ fontSize: 17, letterSpacing: 0 }}>{monthName}</span>
      </div>

      {/* Site label watermark — outside stripe */}
      <div
        className="p3-stripe-num"
        style={{
          position: 'absolute',
          top: '12%', left: '12%',
          fontSize: 48, fontWeight: 900,
          color: 'rgba(255,255,255,0.08)',
          lineHeight: 1,
          letterSpacing: 8,
          textTransform: 'uppercase',
          zIndex: 1,
        }}
      >
        Visit Tonsuya Site
      </div>

      {/* Diagonal white line */}
      <div
        className="p3-line"
        style={{
          position: 'absolute',
          width: '180%', height: 1.5,
          background: 'rgba(255,255,255,0.18)',
          transform: 'rotate(-32deg)',
          transformOrigin: 'center',
          top: '50%', left: '-40%',
        }}
      />

      {/* Day items */}
      {days.map((d, i) => {
        const dist = Math.abs(d.offset);
        const numFs = getSizeForDistance(dist, d.isCurrent);
        const numAlpha = getAlphaForDistance(dist, d.isCurrent);
        const dayFs = d.isCurrent ? 20 : Math.max(10, 14 - dist);
        const dotSize = d.isCurrent ? 26 : Math.max(13, 20 - dist * 1.5);

        const numColor = d.isCurrent
          ? '#ffffff'
          : `rgba(255,255,255,${numAlpha})`;
        const numShadow = d.isCurrent
          ? '0 0 28px rgba(255,255,255,0.2), 0 3px 8px rgba(0,0,0,0.6)'
          : '0 2px 4px rgba(0,0,0,0.3)';
        const dayColor = d.isSunday
          ? '#e74c3c'
          : d.isCurrent
            ? '#f5a623'
            : `rgba(255,255,255,${numAlpha * 0.6})`;

        return (
          <div
            key={`${d.date}-${i}`}
            className="p3d"
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Moon dot */}
            <div className="p3dot" style={{ flexShrink: 0, transform: 'scale(0)' }}>
              <MoonDot
                phase={getMoonPhase(d.date)}
                isActive={d.isCurrent}
                size={dotSize}
                alpha={numAlpha}
              />
              {d.isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: -4, left: -4,
                    width: dotSize + 8, height: dotSize + 8,
                    boxShadow: '0 0 14px rgba(245,200,0,0.45)',
                  }}
                />
              )}
            </div>

            {/* Date number */}
            <span
              style={{
                fontSize: numFs,
                fontWeight: 900,
                color: numColor,
                lineHeight: 1,
                textShadow: numShadow,
              }}
            >
              {d.date}
            </span>

            {/* Day name */}
            <span
              style={{
                fontSize: dayFs,
                fontWeight: 800,
                color: dayColor,
                letterSpacing: 2,
                marginTop: d.isCurrent ? 4 : 2,
              }}
            >
              {d.day}
            </span>

            {/* Sunday line */}
            {d.isSunday && (
              <div
                style={{
                  width: 24, height: 2.5,
                  background: '#e74c3c',
                  borderRadius: 1,
                  marginLeft: 2,
                }}
              />
            )}

            {/* Active ring (only on current day) */}
            {d.isCurrent && (
              <div
                className="p3-ring"
                style={{
                  position: 'absolute',
                  width: 85, height: 85,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  opacity: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
