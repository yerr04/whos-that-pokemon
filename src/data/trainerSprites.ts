export const TRAINER_SPRITE_BASE_URL =
  'https://play.pokemonshowdown.com/sprites/trainers/'

export interface TrainerSprite {
  id: string
  label: string
  category: string
}

export const TRAINER_SPRITES: TrainerSprite[] = [
  // Protagonists
  { id: 'red', label: 'Red', category: 'Protagonists' },
  { id: 'leaf', label: 'Leaf', category: 'Protagonists' },
  { id: 'ethan', label: 'Ethan', category: 'Protagonists' },
  { id: 'lyra', label: 'Lyra', category: 'Protagonists' },
  { id: 'kris', label: 'Kris', category: 'Protagonists' },
  { id: 'brendan', label: 'Brendan', category: 'Protagonists' },
  { id: 'may', label: 'May', category: 'Protagonists' },
  { id: 'lucas', label: 'Lucas', category: 'Protagonists' },
  { id: 'dawn', label: 'Dawn', category: 'Protagonists' },
  { id: 'hilbert', label: 'Hilbert', category: 'Protagonists' },
  { id: 'hilda', label: 'Hilda', category: 'Protagonists' },
  { id: 'nate', label: 'Nate', category: 'Protagonists' },
  { id: 'rosa', label: 'Rosa', category: 'Protagonists' },
  { id: 'calem', label: 'Calem', category: 'Protagonists' },
  { id: 'serena', label: 'Serena', category: 'Protagonists' },
  { id: 'elio', label: 'Elio', category: 'Protagonists' },
  { id: 'selene', label: 'Selene', category: 'Protagonists' },
  { id: 'chase', label: 'Chase', category: 'Protagonists' },
  { id: 'elaine', label: 'Elaine', category: 'Protagonists' },
  { id: 'victor', label: 'Victor', category: 'Protagonists' },
  { id: 'gloria', label: 'Gloria', category: 'Protagonists' },
  { id: 'florian-s', label: 'Florian', category: 'Protagonists' },
  { id: 'juliana-s', label: 'Juliana', category: 'Protagonists' },
  { id: 'rei', label: 'Rei', category: 'Protagonists' },
  { id: 'akari', label: 'Akari', category: 'Protagonists' },
  { id: 'ash', label: 'Ash', category: 'Protagonists' },

  // Rivals & Friends
  { id: 'blue', label: 'Blue', category: 'Rivals' },
  { id: 'silver', label: 'Silver', category: 'Rivals' },
  { id: 'wally', label: 'Wally', category: 'Rivals' },
  { id: 'barry', label: 'Barry', category: 'Rivals' },
  { id: 'bianca', label: 'Bianca', category: 'Rivals' },
  { id: 'cheren', label: 'Cheren', category: 'Rivals' },
  { id: 'hugh', label: 'Hugh', category: 'Rivals' },
  { id: 'shauna', label: 'Shauna', category: 'Rivals' },
  { id: 'hau', label: 'Hau', category: 'Rivals' },
  { id: 'hop', label: 'Hop', category: 'Rivals' },
  { id: 'marnie', label: 'Marnie', category: 'Rivals' },
  { id: 'bede', label: 'Bede', category: 'Rivals' },
  { id: 'nemona-v', label: 'Nemona', category: 'Rivals' },
  { id: 'arven-v', label: 'Arven', category: 'Rivals' },
  { id: 'penny', label: 'Penny', category: 'Rivals' },
  { id: 'gladion', label: 'Gladion', category: 'Rivals' },
  { id: 'lillie', label: 'Lillie', category: 'Rivals' },
  { id: 'n', label: 'N', category: 'Rivals' },

  // Champions
  { id: 'cynthia', label: 'Cynthia', category: 'Champions' },
  { id: 'steven', label: 'Steven', category: 'Champions' },
  { id: 'lance', label: 'Lance', category: 'Champions' },
  { id: 'leon', label: 'Leon', category: 'Champions' },
  { id: 'diantha', label: 'Diantha', category: 'Champions' },
  { id: 'iris', label: 'Iris', category: 'Champions' },
  { id: 'alder', label: 'Alder', category: 'Champions' },
  { id: 'wallace', label: 'Wallace', category: 'Champions' },
  { id: 'geeta', label: 'Geeta', category: 'Champions' },

  // Gym Leaders
  { id: 'misty', label: 'Misty', category: 'Gym Leaders' },
  { id: 'brock', label: 'Brock', category: 'Gym Leaders' },
  { id: 'erika', label: 'Erika', category: 'Gym Leaders' },
  { id: 'sabrina', label: 'Sabrina', category: 'Gym Leaders' },
  { id: 'whitney', label: 'Whitney', category: 'Gym Leaders' },
  { id: 'jasmine', label: 'Jasmine', category: 'Gym Leaders' },
  { id: 'clair', label: 'Clair', category: 'Gym Leaders' },
  { id: 'flannery', label: 'Flannery', category: 'Gym Leaders' },
  { id: 'roxanne', label: 'Roxanne', category: 'Gym Leaders' },
  { id: 'winona', label: 'Winona', category: 'Gym Leaders' },
  { id: 'gardenia', label: 'Gardenia', category: 'Gym Leaders' },
  { id: 'volkner', label: 'Volkner', category: 'Gym Leaders' },
  { id: 'elesa', label: 'Elesa', category: 'Gym Leaders' },
  { id: 'skyla', label: 'Skyla', category: 'Gym Leaders' },
  { id: 'korrina', label: 'Korrina', category: 'Gym Leaders' },
  { id: 'olympia', label: 'Olympia', category: 'Gym Leaders' },
  { id: 'acerola', label: 'Acerola', category: 'Gym Leaders' },
  { id: 'nessa', label: 'Nessa', category: 'Gym Leaders' },
  { id: 'bea', label: 'Bea', category: 'Gym Leaders' },
  { id: 'allister', label: 'Allister', category: 'Gym Leaders' },
  { id: 'raihan', label: 'Raihan', category: 'Gym Leaders' },
  { id: 'iono', label: 'Iono', category: 'Gym Leaders' },
  { id: 'grusha', label: 'Grusha', category: 'Gym Leaders' },
  { id: 'milo', label: 'Milo', category: 'Gym Leaders' },
  { id: 'piers', label: 'Piers', category: 'Gym Leaders' },

  // Villains
  { id: 'giovanni', label: 'Giovanni', category: 'Villains' },
  { id: 'guzma', label: 'Guzma', category: 'Villains' },
  { id: 'lusamine', label: 'Lusamine', category: 'Villains' },
  { id: 'lysandre', label: 'Lysandre', category: 'Villains' },
  { id: 'cyrus', label: 'Cyrus', category: 'Villains' },
  { id: 'rose', label: 'Rose', category: 'Villains' },
  { id: 'plumeria', label: 'Plumeria', category: 'Villains' },

  // Special
  { id: 'oak', label: 'Prof. Oak', category: 'Special' },
  { id: 'nurse', label: 'Nurse Joy', category: 'Special' },
  { id: 'leon-tower', label: 'Leon (Tower)', category: 'Special' },
  { id: 'marnie-league', label: 'Marnie (League)', category: 'Special' },
  { id: 'gloria-league', label: 'Gloria (League)', category: 'Special' },
  { id: 'cynthia-gen4', label: 'Cynthia (Classic)', category: 'Special' },
  { id: 'red-gen7', label: 'Red (Alola)', category: 'Special' },
  { id: 'blue-gen7', label: 'Blue (Alola)', category: 'Special' },
]

export const SPRITE_CATEGORIES = [
  'Protagonists',
  'Rivals',
  'Champions',
  'Gym Leaders',
  'Villains',
  'Special',
] as const

export function getTrainerSpriteUrl(id: string): string {
  return `${TRAINER_SPRITE_BASE_URL}${id}.png`
}

export function getRandomTrainerSprite(): TrainerSprite {
  return TRAINER_SPRITES[Math.floor(Math.random() * TRAINER_SPRITES.length)]
}

export function isTrainerSpriteUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(TRAINER_SPRITE_BASE_URL)
}
