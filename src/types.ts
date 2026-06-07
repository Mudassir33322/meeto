export interface TranscriptEntry {
  id: string;
  user: string;
  lang: string;
  text: string;
  translation: string;
  time: string;
}

export interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
  sender: string;
}

export interface TopicItem {
  id: string;
  title: string;
  details: string;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  completed?: boolean;
}

export interface SummaryData {
  summary: string;
  topics: TopicItem[];
  actionItems: ActionItem[];
  decisions: string[];
  generatedAt: string;
}

export interface SavedMeeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  languages: string[];
  transcript: TranscriptEntry[];
  summaryData?: SummaryData;
  whiteboardDataUrl?: string;
  audioRecordingUrl?: string | null;
  files: SharedFile[];
}

export interface Language {
  code: string;
  name: string;
  flag: string;
  speechCode: string;
}

export const LANGUAGES: Language[] = [
  { code: "English", name: "English", flag: "🇬🇧", speechCode: "en-US" },
  { code: "Urdu", name: "Urdu (اردو)", flag: "🇵🇰", speechCode: "ur-PK" },
  { code: "Arabic", name: "Arabic (العربية)", flag: "🇸🇦", speechCode: "ar-SA" },
  { code: "Spanish", name: "Spanish (Español)", flag: "🇪🇸", speechCode: "es-ES" },
  { code: "French", name: "French (Français)", flag: "🇫🇷", speechCode: "fr-FR" },
  { code: "Chinese", name: "Chinese (中文)", flag: "🇨🇳", speechCode: "zh-CN" },
  { code: "Japanese", name: "Japanese (日本語)", flag: "🇯🇵", speechCode: "ja-JP" },
  { code: "Hindi", name: "Hindi (हिन्दी)", flag: "🇮🇳", speechCode: "hi-IN" },
  { code: "German", name: "German (Deutsch)", flag: "🇩🇪", speechCode: "de-DE" }
];
