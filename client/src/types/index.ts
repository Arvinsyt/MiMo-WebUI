/** 预置音色配置接口 */
export interface VoicePreset {
  /** 唯一标识符 */
  id: string
  /** 音色 ID，传给 API 使用 */
  voiceId: string
  /** 显示名称 */
  label: string
  /** 性别：女声 / 男声 */
  gender: 'female' | 'male'
  /** 语言：中文 / 英文 */
  language: 'zh' | 'en'
  /** 显示图标 */
  emoji: string
}

/** 风格控制模式：自然语言描述 / 预设标签 */
export type StyleMode = 'natural' | 'tag'

/** TTS 合成请求参数 */
export interface TtsRequest {
  /** 要合成的文本内容 */
  text: string
  /** 音色 ID（克隆模式下不传） */
  voiceId?: string
  /** 克隆音色的音频 Base64 数据 */
  voiceBase64?: string
  /** 风格控制模式 */
  styleMode: StyleMode
  /** 自然语言风格描述 */
  stylePrompt: string
  /** 预设风格标签 */
  styleTag: string
}

/** 内置预置音色列表 */
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
