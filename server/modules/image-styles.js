// Picture styles for story illustrations. The active style is the admin setting `image_style`.
// Every style keeps pictures light and child-friendly, even for night scenes.

export const IMAGE_STYLES = {
  bright_cartoon: {
    label: 'Bright cartoon',
    prompt: "Bright, cheerful cartoon illustration for young children: flat colors, clean medium outlines, simple rounded friendly shapes, light pastel palette with sky blue, butter yellow and mint, daytime, minimal shading, uncluttered and playful. Even if the scene is at night, keep it light and bright.",
  },
  soft_pastel: {
    label: 'Soft pastel',
    prompt: "Soft pastel storybook cartoon: very light airy colors, gentle watercolor-like fills with thin soft outlines, big round eyes, cute rounded characters, mostly white and cream background space, calm and sweet. Keep everything light, even night scenes.",
  },
  flat_vector: {
    label: 'Flat vector',
    prompt: "Flat vector cartoon style like a modern kids' app: bold simple shapes, no gradients, bright clean colors, thick outlines, cute characters with big smiles, plain light sky background, very simple and easy to read at small sizes. Keep it light and sunny.",
  },
  storybook_painting: {
    label: 'Storybook painting (the original look)',
    prompt: "Warm, gentle children's picture-book illustration. Soft colors, whimsical and friendly art style.",
  },
};

export const IMAGE_STYLE_KEYS = Object.keys(IMAGE_STYLES);

const SAFETY_TAIL = ' No text or words anywhere in the image, no realistic human faces, safe and gentle for young children.';
const SAFETY_TAIL_NO_PEOPLE = ' No text or words anywhere in the image, no people and no human faces, safe and gentle for young children.';

// scene: what the picture shows. noPeople: library pictures show animals and objects only, so they fit any child's name.
export function illustrationPrompt({ style = 'bright_cartoon', setting = '', scene = '', noPeople = false } = {}) {
  const chosen = IMAGE_STYLES[style] || IMAGE_STYLES.bright_cartoon;
  const where = setting ? ` Setting: ${setting}.` : '';
  const what = scene ? ` Scene: ${scene}` : '';
  return `${chosen.prompt}${where}${what}${noPeople ? SAFETY_TAIL_NO_PEOPLE : SAFETY_TAIL}`.replace(/\s+/g, ' ').trim();
}
