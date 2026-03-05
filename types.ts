export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  CONFUSED = 'confused',
  SURPRISED = 'surprised',
  THINKING = 'thinking'
}

export interface RobotState {
  status: AppState;
  emotion: Emotion;
  transcript: string;
  response: string;
}
