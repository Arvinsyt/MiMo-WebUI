export interface VoicePreset {
  id: string
  voiceId: string
  label: string
  gender: 'female' | 'male'
  language: 'zh' | 'en'
  emoji: string
}

export type StyleMode = 'natural' | 'tag'

export interface TtsRequest {
  text: string
  voiceId?: string
  voiceBase64?: string
  styleMode: StyleMode
  stylePrompt: string
  styleTag: string
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: '冰糖', voiceId: '冰糖', label: '冰糖', gender: 'female', language: 'zh', emoji: '🧊' },
  { id: '茉莉', voiceId: '茉莉', label: '茉莉', gender: 'female', language: 'zh', emoji: '🌸' },
  { id: '苏打', voiceId: '苏打', label: '苏打', gender: 'male', language: 'zh', emoji: '🥤' },
  { id: '白桦', voiceId: '白桦', label: '白桦', gender: 'male', language: 'zh', emoji: '🌲' },
  { id: 'Mia', voiceId: 'Mia', label: 'Mia', gender: 'female', language: 'en', emoji: '👩' },
  { id: 'Chloe', voiceId: 'Chloe', label: 'Chloe', gender: 'female', language: 'en', emoji: '👩' },
  { id: 'Milo', voiceId: 'Milo', label: 'Milo', gender: 'male', language: 'en', emoji: '👦' },
  { id: 'Dean', voiceId: 'Dean', label: 'Dean', gender: 'male', language: 'en', emoji: '👨' }
]