"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A few synthesized sounds for the stage, made with the Web Audio API so there is
 * nothing to download. Browsers only allow sound after a tap, so `unlock` is
 * called from the Draw button.
 */
export function useStageSound() {
  const context = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const unlock = useCallback(() => {
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
    } catch {
      // No audio on this device; the stage works silently.
    }
  }, []);

  const beep = useCallback((frequency: number, seconds: number, type: OscillatorType, volume: number, delay = 0) => {
    const audio = context.current;
    if (!audio || mutedRef.current) return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + seconds + 0.02);
    } catch {
      // Ignored: sound is only a bonus.
    }
  }, []);

  /** The ticking of the reel, higher as it slows down. `progress` runs from 0 to 1. */
  const tick = useCallback((progress: number) => beep(260 + progress * 520, 0.06, "square", 0.05), [beep]);

  const fanfare = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => beep(frequency, 0.5, "triangle", 0.12, index * 0.12));
  }, [beep]);

  const toggle = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  return { muted, toggle, unlock, tick, fanfare };
}
