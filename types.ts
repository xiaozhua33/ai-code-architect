export interface DocGenerationResponse {
  markdown: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  preview: string;
  fullContent: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
