// Read-aloud voices. Plain text-to-speech sounds flat; the `instructions` field tells the model how to read
// (tone, pace, warmth), which makes a large difference and costs nothing extra.

export const NARRATION_MODEL = 'gpt-4o-mini-tts';

// Bump when the voices or directions change, so old cached audio files are not reused.
export const NARRATION_VERSION = 'v2';

const WARM_DIRECTION = "Voice: clear, friendly and likable, like a favorite teacher or parent reading a picture book aloud, equally good in the daytime or at bedtime. Pace: natural and steady, not sleepy and not rushed, with short pauses at commas and at the end of sentences so every word is easy to understand. Tone: warm and upbeat with a smile in the voice; show gentle wonder or excitement where the story has it, and give the characters' words a little life. Pronounce every word clearly. Never sound robotic, flat, sleepy or like a news reader.";
const CALM_DIRECTION = "Voice: soft, calm and soothing, like a bedtime story read in a quiet room. Pace: slow and relaxed with gentle pauses. Tone: kind and warm, with light expression for the characters' words. Never robotic.";
const PLAYFUL_DIRECTION = "Voice: bright, playful and animated, like a fun storyteller at a children's library. Pace: lively but always clear, with room to breathe. Tone: cheerful and full of wonder, with a different little voice for each character. Never robotic or flat.";

// The "warm" narrator uses the voice from the admin setting `narration_voice` (default marin).
export function narrationRequest({ style = 'warm', text, warmVoice = 'marin' }) {
  const styles = {
    warm: { voice: warmVoice, instructions: WARM_DIRECTION },
    calm: { voice: 'cedar', instructions: CALM_DIRECTION },
    playful: { voice: 'coral', instructions: PLAYFUL_DIRECTION },
  };
  const chosen = styles[style] || styles.warm;
  return { model: NARRATION_MODEL, voice: chosen.voice, instructions: chosen.instructions, input: text, response_format: 'mp3' };
}
