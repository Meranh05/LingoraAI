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
  showMascot: boolean;
  compactMode: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setMotionEnabled: (enabled: boolean) => void;
  setShowMascot: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
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
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences?: {
    showMascot: boolean;
    compactMode: boolean;
  };
}) {
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [motionEnabled, setMotionEnabledState] = useState(true);
  const [showMascot, setShowMascotState] = useState(
    initialPreferences?.showMascot ?? true,
  );
  const [compactMode, setCompactModeState] = useState(
    initialPreferences?.compactMode ?? false,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSoundEnabledState(localStorage.getItem("lingora:sound") === "true");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setMotionEnabledState(
        localStorage.getItem("lingora:motion") !== "false" && !reduced,
      );
      const mascotPreference = localStorage.getItem("lingora:mascot");
      const compactPreference = localStorage.getItem("lingora:compact");
      setShowMascotState(
        mascotPreference === null
          ? initialPreferences?.showMascot ?? true
          : mascotPreference !== "false",
      );
      setCompactModeState(
        compactPreference === null
          ? initialPreferences?.compactMode ?? false
          : compactPreference === "true",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialPreferences?.compactMode, initialPreferences?.showMascot]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled ? "full" : "reduced";
  }, [motionEnabled]);

  useEffect(() => {
    document.documentElement.dataset.density = compactMode ? "compact" : "comfortable";
  }, [compactMode]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("lingora:sound", String(enabled));
  }, []);

  const setMotionEnabled = useCallback((enabled: boolean) => {
    setMotionEnabledState(enabled);
    localStorage.setItem("lingora:motion", String(enabled));
  }, []);

  const setShowMascot = useCallback((enabled: boolean) => {
    setShowMascotState(enabled);
    localStorage.setItem("lingora:mascot", String(enabled));
  }, []);

  const setCompactMode = useCallback((enabled: boolean) => {
    setCompactModeState(enabled);
    localStorage.setItem("lingora:compact", String(enabled));
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
      showMascot,
      compactMode,
      setSoundEnabled,
      setMotionEnabled,
      setShowMascot,
      setCompactMode,
      play,
    }),
    [
      motionEnabled,
      showMascot,
      compactMode,
      play,
      setCompactMode,
      setMotionEnabled,
      setShowMascot,
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
