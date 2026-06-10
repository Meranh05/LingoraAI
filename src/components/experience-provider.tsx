"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type SoundName = "tap" | "success" | "error" | "complete";

type ExperienceContextValue = {
  soundEnabled: boolean;
  motionEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setMotionEnabled: (enabled: boolean) => void;
  play: (sound: SoundName) => void;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gainValue: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function ExperienceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [motionEnabled, setMotionEnabledState] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSoundEnabledState(localStorage.getItem("lingora:sound") === "true");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMotionEnabledState(
        localStorage.getItem("lingora:motion") !== "false" && !reduced,
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled ? "full" : "reduced";
  }, [motionEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("lingora:sound", String(enabled));
  }, []);

  const setMotionEnabled = useCallback((enabled: boolean) => {
    setMotionEnabledState(enabled);
    localStorage.setItem("lingora:motion", String(enabled));
  }, []);

  const play = useCallback(
    (sound: SoundName) => {
      if (!soundEnabled || typeof window === "undefined") return;
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const now = context.currentTime;
      const patterns: Record<SoundName, Array<[number, number, number]>> = {
        tap: [[520, 0, 0.07]],
        success: [
          [523, 0, 0.11],
          [659, 0.09, 0.14],
        ],
        error: [
          [220, 0, 0.12],
          [175, 0.1, 0.16],
        ],
        complete: [
          [523, 0, 0.12],
          [659, 0.1, 0.12],
          [784, 0.2, 0.2],
        ],
      };
      patterns[sound].forEach(([frequency, offset, duration]) =>
        tone(context, frequency, now + offset, duration, 0.055),
      );
      window.setTimeout(() => void context.close(), 700);
    },
    [soundEnabled],
  );

  const value = useMemo(
    () => ({
      soundEnabled,
      motionEnabled,
      setSoundEnabled,
      setMotionEnabled,
      play,
    }),
    [
      motionEnabled,
      play,
      setMotionEnabled,
      setSoundEnabled,
      soundEnabled,
    ],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience must be used inside ExperienceProvider.");
  }
  return context;
}
