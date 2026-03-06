export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
  IMAGE_GEN_COUNTDOWN = 'IMAGE_GEN_COUNTDOWN',
  IMAGE_GEN_RECORDING = 'IMAGE_GEN_RECORDING',
  IMAGE_GEN_GENERATING = 'IMAGE_GEN_GENERATING',
  IMAGE_GEN_RESULT = 'IMAGE_GEN_RESULT',
  IMAGE_GEN_TRANSITION_BACK = 'IMAGE_GEN_TRANSITION_BACK',
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
