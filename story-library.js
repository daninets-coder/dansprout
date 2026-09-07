window.StorySproutLibrary = [
  {
    id: 'moonlight-lantern',
    title: 'The Lantern of Little Wishes',
    ageBands: ['3-5', '6-8'],
    goal: 'Kindness',
    themes: ['Moonlight'],
    tags: ['garden', 'night', 'help', 'light', 'star'],
    pages: [
      '{name} found a tiny lantern waiting beneath the garden gate.',
      'The lantern glowed when {name} thought of a kind thing to do.',
      '{name} held the light high so everyone could find the path home.'
    ],
    question: 'What kind thing could make someone else feel welcome today?'
  },
  {
    id: 'rainforest-bridge',
    title: 'The Rainforest Bridge',
    ageBands: ['3-5', '6-8', '9-11'],
    goal: 'Bravery',
    themes: ['Rainforest'],
    tags: ['forest', 'bridge', 'river', 'map', 'adventure'],
    pages: [
      'A little wooden bridge crossed the bright rainforest river, but {name} was not sure about taking the first step.',
      '{name} listened to the water, took a slow breath, and noticed each sturdy board beneath their feet.',
      'One careful step became two, and {name} discovered that courage can be quiet and steady.'
    ],
    question: 'When have you taken a small brave step?'
  },
  {
    id: 'ocean-shell',
    title: 'The Singing Shell',
    ageBands: ['3-5', '6-8'],
    goal: 'Curiosity',
    themes: ['Ocean'],
    tags: ['ocean', 'shell', 'beach', 'sea', 'song'],
    pages: [
      'At the edge of the sea, {name} found a pearly shell that hummed a very small song.',
      'Instead of rushing away, {name} listened closely and asked, “Where does that sound come from?”',
      'The tide answered with another clue, and {name} learned that good questions lead to good discoveries.'
    ],
    question: 'What is one question you would ask the singing shell?'
  },
  {
    id: 'castle-key',
    title: 'The Garden Key',
    ageBands: ['6-8', '9-11'],
    goal: 'Curiosity',
    themes: ['Castle'],
    tags: ['key', 'garden', 'castle', 'door', 'secret'],
    pages: [
      '{name} found an old brass key beneath a bench in the castle garden.',
      'The key did not open the largest door. It opened a tiny gate that {name} had never noticed before.',
      'Beyond it grew a quiet garden of labels, maps, and new questions waiting to be explored.'
    ],
    question: 'What do you think {name} will discover in the hidden garden?'
  },
  {
    id: 'moonlight-cloud',
    title: 'The Cloud That Needed a Pause',
    ageBands: ['3-5', '6-8'],
    goal: 'Big feelings',
    themes: ['Moonlight'],
    tags: ['cloud', 'feeling', 'calm', 'night', 'worry'],
    pages: [
      'A small cloud followed {name} through the moonlit sky, growing puffier whenever it worried.',
      '{name} taught the cloud to pause, breathe slowly, and name what it was feeling.',
      'The cloud became lighter, and {name} remembered that feelings can be noticed without taking over the whole day.'
    ],
    question: 'What helps your body feel calmer when you have a big feeling?'
  },
  {
    id: 'ocean-helper',
    title: 'The Little Boat That Waited',
    ageBands: ['6-8', '9-11'],
    goal: 'Kindness',
    themes: ['Ocean'],
    tags: ['boat', 'ocean', 'help', 'friend', 'beach'],
    pages: [
      '{name} spotted a little boat waiting near the shore while the other boats hurried past.',
      'The boat was not lost; it was waiting for a friend who was learning to row.',
      '{name} stayed too, and together they learned that kindness sometimes means making time.'
    ],
    question: 'How can waiting with someone be a kind choice?'
  },
  {
    id: 'rainforest-words',
    title: 'The Word Collector',
    ageBands: ['6-8', '9-11'],
    goal: 'Early literacy',
    themes: ['Rainforest'],
    tags: ['word', 'letter', 'reading', 'forest', 'book'],
    pages: [
      '{name} discovered that every rainforest leaf carried one bright new word.',
      'Some words described things, some words described actions, and some made {name} laugh when read aloud.',
      'By sunset, {name} had a pocket full of words and a new favorite way to tell a story.'
    ],
    question: 'Which word in this story would you like to use in a sentence?'
  },
  {
    id: 'castle-compass',
    title: 'The Compass of Small Steps',
    ageBands: ['9-11'],
    goal: 'Bravery',
    themes: ['Castle'],
    tags: ['castle', 'compass', 'brave', 'steps', 'challenge'],
    pages: [
      'In the castle library, {name} found a compass that did not point north. It pointed toward the next helpful step.',
      'When the hallway seemed too long, the compass pointed to a lantern, then a note, then a friend who could listen.',
      '{name} learned that courage is rarely one giant leap; it is a series of choices made with care.'
    ],
    question: 'What is one small step that can help when a task feels difficult?'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const heading = document.querySelector('#createStory')?.closest('.en-card')?.querySelector('h2');
  const description = document.querySelector('#createStory')?.closest('.en-card')?.querySelector('p');
  const button = document.querySelector('#createStory .en-button');
  if (heading) heading.textContent = 'Find a reviewed story';
  if (description) description.textContent = 'Choose a learner and focus. Story Sprout selects a safe, age-appropriate story from its local library.';
  if (button) button.textContent = 'Choose story from library';
});
