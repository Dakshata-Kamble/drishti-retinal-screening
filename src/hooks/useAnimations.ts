import { useState, useEffect, useRef, useCallback } from 'react';

// ── Animation Design Tokens ─────────────────────────────────────────────
export const ANIM = {
  // Durations (ms)
  fast: 150,
  normal: 220,
  emphasis: 500,
  dataViz: 800,

  // Easing
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Stagger base (ms)
  stagger: 60,
} as const;

// ── Reduced Motion Detection ────────────────────────────────────────────
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// ── Viewport Intersection Observer ──────────────────────────────────────
export function useInView(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el); // only trigger once
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
}

// ── Animated Counter Hook ───────────────────────────────────────────────
export function useCountUp(
  target: number,
  shouldStart: boolean,
  duration: number = ANIM.dataViz
): number {
  const [value, setValue] = useState(0);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!shouldStart) return;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, shouldStart, duration, prefersReduced]);

  return value;
}

// ── Animated Progress Hook ──────────────────────────────────────────────
export function useAnimatedProgress(
  target: number,
  shouldStart: boolean,
  duration: number = ANIM.dataViz
): number {
  const [value, setValue] = useState(0);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!shouldStart) return;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, shouldStart, duration, prefersReduced]);

  return value;
}

// ── Stagger index helper ────────────────────────────────────────────────
export function staggerDelay(index: number, base: number = ANIM.stagger): string {
  return `${index * base}ms`;
}

// ── CSS class helpers for entrance animations ───────────────────────────
export function entranceClass(isVisible: boolean, index: number = 0): string {
  if (!isVisible) return 'drishti-entrance';
  return `drishti-entrance drishti-entrance--visible`;
}

export function entranceStyle(
  isVisible: boolean,
  index: number = 0,
  baseDelay: number = ANIM.stagger
): React.CSSProperties {
  return {
    transitionDelay: isVisible ? `${index * baseDelay}ms` : '0ms',
  };
}
