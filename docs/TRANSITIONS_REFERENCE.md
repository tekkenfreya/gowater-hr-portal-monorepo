# GoWater Transitions & Animations Reference

> **Source:** Adapted from Orbit-Matter Style Catalog
> **Purpose:** Reusable GSAP animation patterns for GoWater web app

---

## Pattern Index

| # | Name | What It Is | Used In |
|---|---|---|---|
| 1 | **Pixel Dissolve** | Grid blocks vanish randomly (preloader exit) | Dashboard auth loading |
| 2 | **Pixel Wipe** | Grid blocks cover/reveal screen (page transition) | Future page transitions |
| 3 | **Curtain Rise** | Text lines slide up from behind a mask | Heading entrances |
| 4 | **Matrix Type** | Characters appear randomly like a terminal | Small labels, metadata |
| 5 | **Iris Open** | Panel slides up with circular clip-path | Detail panels |
| 6 | **P3 Calendar** | Persona 3 Reload diagonal calendar transition | Login → Dashboard |

---

## 1. Pixel Dissolve — Preloader Grid Scatter

> Screen is covered by a grid of small dark squares (60px each). Squares vanish one by one in random order — like pixels being erased. Each square blinks out nearly instantly (0.05s), staggered randomly over 0.5s total.

```javascript
const timeline = gsap.timeline({ delay: 1.75 });

// Fade out loading animation
timeline.to(preloaderAnimationWrapper, { opacity: 0, duration: 0.3 });

// Scatter blocks out
timeline.to(blocks, {
  opacity: 0,
  duration: 0.05,
  ease: 'power2.inOut',
  stagger: {
    amount: 0.5,
    each: 0.01,
    from: 'random',
  },
});
```

```css
.preloader-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100svh;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

.preloader-block {
  position: absolute;
  background-color: var(--bg-primary);
  opacity: 1;
  will-change: opacity;
}
```

---

## 2. Pixel Wipe — Page Transition Grid

> Reverse of Pixel Dissolve. Dark squares randomly appear to cover the screen, then randomly disappear on the new page. Replaces white flash of navigation.

```javascript
// Cover: blocks fade in randomly
function animateTransition() {
  return new Promise((resolve) => {
    gsap.set(blocks, { opacity: 0 });
    gsap.to(blocks, {
      opacity: 1,
      duration: 0.05,
      ease: 'power2.inOut',
      stagger: { amount: 0.5, each: 0.01, from: 'random' },
      onComplete: () => setTimeout(() => resolve(), 300),
    });
  });
}

// Reveal: blocks fade out randomly
function revealTransition() {
  gsap.to(blocks, {
    opacity: 0,
    duration: 0.05,
    ease: 'power2.inOut',
    stagger: { amount: 0.5, each: 0.01, from: 'random' },
  });
}
```

```css
.transition-grid {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.transition-block {
  position: absolute;
  background-color: var(--bg-primary);
  opacity: 0;
  will-change: opacity;
}
```

---

## 3. Curtain Rise — Line Mask Reveal

> Each line of text starts hidden below an invisible edge, then slides upward into view. Lines cascade with stagger.

```css
.line-mask {
  position: relative;
  overflow: hidden;
  display: flex;
}

.line {
  position: relative;
  will-change: transform;
}
```

```javascript
// Manual version (no SplitText):
// Wrap each line in overflow:hidden container
gsap.set(lineRef, { yPercent: 100 });
gsap.to(lineRef, { yPercent: 0, duration: 0.75, ease: 'power3.out', stagger: 0.1 });
```

---

## 4. Matrix Type — Character Flicker

> Each letter pops into existence individually in random order — like a hacking terminal. Entire text materializes over ~0.5s, individual letters appear in 0.05s each.

```javascript
gsap.from(characters, {
  opacity: 0,
  duration: 0.05,
  ease: 'power2.inOut',
  stagger: { amount: 0.5, from: 'random' },
});
```

---

## 5. Iris Open — Preview Expand

> Panel slides up while surrounding content fades. Controller ring shrinks inward (like camera iris closing).

```javascript
// Panel slide
gsap.to(panel, {
  y: isOpen ? '100%' : '-50%',
  duration: 0.75,
  ease: 'power3.inOut',
});

// Controller clip-path
gsap.to(outer, {
  clipPath: opening ? 'circle(0% at 50% 50%)' : 'circle(50% at 50% 50%)',
  duration: 0.75,
  ease: 'power3.inOut',
});
```

---

## 6. P3 Calendar — Persona 3 Reload Diagonal Calendar

> Login → Dashboard transition. Horizontal blue stripe, diagonal day labels with moon dots, cascading animations. See `apps/web/src/components/P3LoadingScreen.tsx`.

Key animation sequence:
1. Day items cascade in with `back.out(1.3)` stagger
2. Moon dots pop with `back.out(2.5)`
3. Blue stripe sweeps in with `clipPath: inset()`
4. Year/month labels fade in
5. Ripple circles scale in
6. Active ring pulses
7. Everything fades out → dashboard

---

## GSAP Easing Quick Reference

| Easing | Feel | Best For |
|---|---|---|
| `power3.out` | Fast start, gentle stop | Slide-in animations, Curtain Rise |
| `power3.inOut` | Slow-fast-slow, cinematic | Iris Open, clip-path animations |
| `power2.inOut` | Symmetric accel/decel | Pixel Dissolve/Wipe grid blocks |
| `back.out(1.7)` | Overshoot then settle | Element pop-in, dot appearances |
| `sine.inOut` | Gentle wave | Pulse loops, breathing effects |

## Duration Quick Reference

| Duration | Feel | Use Case |
|---|---|---|
| `0.05s` | Instant blink | Pixel Dissolve/Wipe individual blocks |
| `0.3s` | Responsive | Button hover, icon spin |
| `0.5s` | Smooth | Panel transitions |
| `0.75s` | Cinematic | Curtain Rise reveals, Iris Open |
| `1-2s` | Dramatic | Stripe sweep, full-screen transitions |
