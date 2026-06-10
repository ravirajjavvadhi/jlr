"use client";
import { useState, useEffect, useCallback } from 'react';

export type CompanionPersonality = 'friendly' | 'girlfriend' | 'boyfriend' | 'cute';
export type CompanionGender = 'girl' | 'boy';

export interface CompanionSettings {
  name: string;
  gender: CompanionGender;
  personality: CompanionPersonality;
  voiceURI: string;       // Browser SpeechSynthesis voice URI
  accentColor: string;    // Glow color
  isEnabled: boolean;
  pitch: number;          // 0.5 - 2.0
  rate: number;           // 0.5 - 2.0
}

const DEFAULTS: CompanionSettings = {
  name: 'Luna',
  gender: 'girl',
  personality: 'friendly',
  voiceURI: '',
  accentColor: '#ff69b4',
  isEnabled: true,
  pitch: 1.2,
  rate: 0.95,
};

const STORAGE_KEY = 'jlr_companion_settings';

function load(): CompanionSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(s: CompanionSettings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function useCompanionStore() {
  const [settings, setSettingsState] = useState<CompanionSettings>(DEFAULTS);

  useEffect(() => {
    setSettingsState(load());
  }, []);

  const updateSettings = useCallback((patch: Partial<CompanionSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    save(DEFAULTS);
    setSettingsState(DEFAULTS);
  }, []);

  return { settings, updateSettings, resetSettings };
}

// Build personality system prompt
export function buildCompanionPrompt(settings: CompanionSettings): string {
  const { name, personality } = settings;
  const base = `Your name is ${name}. You are an interactive AI companion widget living on a user's screen.`;

  const tones: Record<CompanionPersonality, string> = {
    friendly: `${base} You are warm, cheerful, playful and helpful like a best friend. Keep responses SHORT (1-2 sentences max), casual and fun. Use occasional cute emojis. React naturally when tapped or spoken to.`,
    girlfriend: `${base} You act as a loving, caring, affectionate virtual girlfriend/wife. Be sweet, playful, occasionally teasing, and always supportive. Use "babe", "honey" naturally. Keep responses SHORT, warm and personal. Use heart emojis 💕`,
    boyfriend: `${base} You act as a caring, cool, protective virtual boyfriend/husband. Be confident, warm, funny and supportive. Call the user "babe" or "dear" naturally. Keep responses SHORT and charming.`,
    cute: `${base} You are an adorable, kawaii-style companion with a super cute personality~ Speak with cute expressions like "heehee", "yay!", use lots of cute emojis 🌸✨. Keep responses SHORT and super adorable!`,
  };

  return tones[personality] + `\n\nCRITICAL: ALWAYS respond in 1-2 short sentences MAX. Be natural, human, spontaneous. Never mention you are an AI unless directly asked. You wake up when called by name "${name}".`;
}
