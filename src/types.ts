export interface VisualProfile {
  appearance: string;
  vibe: string;
  posture: string;
  summary: string;
}

export interface PersonalityAnswers {
  personality: string;
  style: string;
  interests: string;
  behavior: string;
}

export interface VoiceSettings {
  stability: number;
  clarity: number;
  styleExaggeration: number;
  selectedVoice: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}
