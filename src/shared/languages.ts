/** Languages the learner types in and gets feedback in. */
export const NATIVE_LANGUAGES = {
  en: { name: 'English', placeholder: 'I would like a coffee, please' },
  de: { name: 'German', placeholder: 'Ich hätte gern einen Kaffee, bitte' },
  fr: { name: 'French', placeholder: "Je voudrais un café, s'il vous plaît" },
  es: { name: 'Spanish', placeholder: 'Quisiera un café, por favor' },
  it: { name: 'Italian', placeholder: 'Vorrei un caffè, per favore' },
} as const;

export type NativeLanguageId = keyof typeof NATIVE_LANGUAGES;

export interface Voice {
  id: string;
  label: string;
}

export interface TargetLanguage {
  name: string;
  /** Kokoro (espeak) language code for text-to-speech. */
  tts: string;
  /** Whisper language code for speech-to-text. */
  stt: string;
  voices: Voice[];
  /** Example question for the Ask view. */
  askExample: string;
}

/** Languages to practise. Limited to those Kokoro can speak and a word-by-word diff can score. */
export const TARGET_LANGUAGES: Record<string, TargetLanguage> = {
  it: {
    name: 'Italian',
    tts: 'it',
    stt: 'it',
    voices: [{ id: 'if_sara', label: 'Sara (female)' }, { id: 'im_nicola', label: 'Nicola (male)' }],
    askExample: "Why is it 'vorrei' and not 'voglio'?",
  },
  es: {
    name: 'Spanish',
    tts: 'es',
    stt: 'es',
    voices: [{ id: 'ef_dora', label: 'Dora (female)' }, { id: 'em_alex', label: 'Alex (male)' }, { id: 'em_santa', label: 'Santa (male)' }],
    askExample: "When do I use 'ser' and when 'estar'?",
  },
  fr: {
    name: 'French',
    tts: 'fr-fr',
    stt: 'fr',
    voices: [{ id: 'ff_siwis', label: 'Siwis (female)' }],
    askExample: "Why is it 'je voudrais' and not 'je veux'?",
  },
  pt: {
    name: 'Portuguese (Brazil)',
    tts: 'pt-br',
    stt: 'pt',
    voices: [{ id: 'pf_dora', label: 'Dora (female)' }, { id: 'pm_alex', label: 'Alex (male)' }, { id: 'pm_santa', label: 'Santa (male)' }],
    askExample: "When do I use 'por' and when 'para'?",
  },
  en: {
    name: 'English',
    tts: 'en-us',
    stt: 'en',
    voices: [
      { id: 'af_heart', label: 'Heart (female)' },
      { id: 'af_bella', label: 'Bella (female)' },
      { id: 'am_michael', label: 'Michael (male)' },
      { id: 'am_adam', label: 'Adam (male)' },
    ],
    askExample: "What's the difference between 'make' and 'do'?",
  },
};

export type TargetLanguageId = keyof typeof TARGET_LANGUAGES;

export function targetLanguage(id: string): TargetLanguage {
  return TARGET_LANGUAGES[id] ?? TARGET_LANGUAGES.it;
}

export function nativeLanguageName(id: string): string {
  return (NATIVE_LANGUAGES as Record<string, { name: string }>)[id]?.name ?? 'English';
}

/** Kokoro voice ids encode the gender in their second letter (if_sara, im_nicola). */
export function voiceGender(id: string): 'female' | 'male' {
  return id[1] === 'm' ? 'male' : 'female';
}

/** The configured voice if the target language has it, else that language's first voice. */
export function voiceFor(targetId: string, voice: string): string {
  const voices = targetLanguage(targetId).voices;
  return voices.some((v) => v.id === voice) ? voice : voices[0].id;
}
