import { Emotion } from './types';

export const EYE_COLOR = '#06b6d4'; // Cyan-500
export const EYE_COLOR_ACTIVE = '#22d3ee'; // Cyan-400
export const EYE_COLOR_ANGRY = '#ef4444'; // Red-500
export const EYE_COLOR_HAPPY = '#22c55e'; // Green-500

export const DEFAULT_SYSTEM_PROMPT = `
You are a witty, helpful robot assistant living in a screen. 
You are having a real-time voice conversation with a user.
Keep your responses concise, conversational, and friendly.
Do not use markdown formatting.
`;

export const COLOR_MAP: Record<Emotion, string> = {
  [Emotion.NEUTRAL]: EYE_COLOR,
  [Emotion.HAPPY]: EYE_COLOR_HAPPY,
  [Emotion.SAD]: '#3b82f6', // Blue
  [Emotion.ANGRY]: EYE_COLOR_ANGRY,
  [Emotion.CONFUSED]: '#a855f7', // Purple
  [Emotion.SURPRISED]: '#facc15', // Yellow
  [Emotion.THINKING]: '#f97316', // Orange
};
