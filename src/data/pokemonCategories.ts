// src/data/pokemonCategories.ts

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ---------------------------------------------------------------------------
// Form ID ranges (all accessible via /api/v2/pokemon/{id})
// ---------------------------------------------------------------------------

export const MEGA_FORM_IDS = new Set([...range(10033, 10090), ...range(10278, 10325)])
export const ALOLAN_FORM_IDS = new Set(range(10091, 10115))
export const ZYGARDE_FORM_IDS = new Set(range(10118, 10120))
export const GALARIAN_FORM_IDS = new Set(range(10161, 10180))
export const HISUIAN_FORM_IDS = new Set(range(10229, 10244))
export const PALDEAN_FORM_IDS = new Set([10253])

export const ALL_FORM_IDS = new Set([
  ...MEGA_FORM_IDS,
  ...ALOLAN_FORM_IDS,
  ...ZYGARDE_FORM_IDS,
  ...GALARIAN_FORM_IDS,
  ...HISUIAN_FORM_IDS,
  ...PALDEAN_FORM_IDS,
])

export const BASE_POKEMON_COUNT = 1025

export const VALID_POKEMON_IDS: number[] = [
  ...range(1, BASE_POKEMON_COUNT),
  ...ALL_FORM_IDS,
]

// ---------------------------------------------------------------------------
// Special status ID sets (for hint categories)
// ---------------------------------------------------------------------------

export const STARTER_IDS = new Set([
  // Gen 1: Bulbasaur line, Charmander line, Squirtle line
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  // Gen 2: Chikorita line, Cyndaquil line, Totodile line
  152, 153, 154, 155, 156, 157, 158, 159, 160,
  // Gen 3: Treecko line, Torchic line, Mudkip line
  252, 253, 254, 255, 256, 257, 258, 259, 260,
  // Gen 4: Turtwig line, Chimchar line, Piplup line
  387, 388, 389, 390, 391, 392, 393, 394, 395,
  // Gen 5: Snivy line, Tepig line, Oshawott line
  495, 496, 497, 498, 499, 500, 501, 502, 503,
  // Gen 6: Chespin line, Fennekin line, Froakie line
  650, 651, 652, 653, 654, 655, 656, 657, 658,
  // Gen 7: Rowlet line, Litten line, Popplio line
  722, 723, 724, 725, 726, 727, 728, 729, 730,
  // Gen 8: Grookey line, Scorbunny line, Sobble line
  810, 811, 812, 813, 814, 815, 816, 817, 818,
  // Gen 9: Sprigatito line, Fuecoco line, Quaxly line
  906, 907, 908, 909, 910, 911, 912, 913, 914,
])

export const FOSSIL_IDS = new Set([
  // Gen 1: Omanyte, Omastar, Kabuto, Kabutops, Aerodactyl
  138, 139, 140, 141, 142,
  // Gen 3: Lileep, Cradily, Anorith, Armaldo
  345, 346, 347, 348,
  // Gen 4: Cranidos, Rampardos, Shieldon, Bastiodon
  408, 409, 410, 411,
  // Gen 5: Tirtouga, Carracosta, Archen, Archeops
  564, 565, 566, 567,
  // Gen 6: Tyrunt, Tyrantrum, Amaura, Aurorus
  696, 697, 698, 699,
  // Gen 8: Dracozolt, Arctozolt, Dracovish, Arctovish
  880, 881, 882, 883,
])

export const ULTRA_BEAST_IDS = new Set([
  793, // Nihilego
  794, // Buzzwole
  795, // Pheromosa
  796, // Xurkitree
  797, // Celesteela
  798, // Kartana
  799, // Guzzlord
  803, // Poipole
  804, // Naganadel
  805, // Stakataka
  806, // Blacephalon
])

export const PARADOX_IDS = new Set([
  // Scarlet exclusives
  984, 985, 986, 987, 988, 989, // Great Tusk → Sandy Shocks
  1005, // Roaring Moon
  1007, // Walking Wake
  1020, // Gouging Fire
  1021, // Raging Bolt
  // Violet exclusives
  990, 991, 992, 993, 994, 995, // Iron Treads → Iron Thorns
  1006, // Iron Valiant
  1008, // Iron Leaves
  1022, // Iron Boulder
  1023, // Iron Crown
])

export const PSEUDO_LEGENDARY_IDS = new Set([
  147, 148, 149, // Dratini → Dragonite
  246, 247, 248, // Larvitar → Tyranitar
  371, 372, 373, // Bagon → Salamence
  374, 375, 376, // Beldum → Metagross
  443, 444, 445, // Gible → Garchomp
  633, 634, 635, // Deino → Hydreigon
  704, 705, 706, // Goomy → Goodra
  782, 783, 784, // Jangmo-o → Kommo-o
  885, 886, 887, // Dreepy → Dragapult
  996, 997, 998, // Frigibax → Baxcalibur
])

export const GIGANTAMAX_IDS = new Set([
  3, 6, 9, 12, 25, 52, 68, 94, 99, 131, 133, 143,
  569, 809, 812, 815, 818, 823, 826, 834, 839, 841,
  842, 844, 849, 851, 858, 861, 869, 879, 884, 892,
])

// Base form IDs that have mega evolutions (for "Has Mega Evolution" hint)
export const HAS_MEGA_IDS = new Set([
  3, 6, 9, 15, 18, 65, 80, 94, 115, 127, 130, 142, 150,
  181, 208, 212, 214, 229, 248, 254, 257, 260, 282, 302,
  303, 306, 308, 310, 319, 323, 334, 354, 359, 362, 373,
  376, 380, 381, 384, 428, 445, 448, 460, 475, 531, 719,
])

// Base form IDs that have regional variants
export const HAS_REGIONAL_FORM_IDS = new Set([
  // Alolan
  19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105,
  // Galarian
  77, 78, 79, 80, 83, 110, 122, 144, 145, 146, 199, 222, 263, 264, 554, 555, 562, 618,
  // Hisuian
  58, 59, 100, 101, 157, 211, 215, 503, 549, 570, 571, 628, 705, 706, 713, 724,
  // Paldean
  194,
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isFormPokemon(id: number): boolean {
  return ALL_FORM_IDS.has(id)
}

export function getFormCategory(id: number): string {
  if (MEGA_FORM_IDS.has(id)) return 'Mega'
  if (ALOLAN_FORM_IDS.has(id)) return 'Alolan'
  if (ZYGARDE_FORM_IDS.has(id)) return 'Zygarde'
  if (GALARIAN_FORM_IDS.has(id)) return 'Galarian'
  if (HISUIAN_FORM_IDS.has(id)) return 'Hisuian'
  if (PALDEAN_FORM_IDS.has(id)) return 'Paldean'
  return 'Base'
}

function capitalizeWord(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert an API name like "venusaur-mega" into a display name like "Venusaur (Mega)".
 * Falls back to capitalized API name if no form suffix is detected.
 */
export function formatFormDisplayName(apiName: string, pokemonId?: number): string {
  const megaXY = apiName.match(/^(.+)-mega-([xy])$/i)
  if (megaXY) {
    return `${megaXY[1].split('-').map(capitalizeWord).join('-')} (Mega ${megaXY[2].toUpperCase()})`
  }

  const mega = apiName.match(/^(.+)-mega$/i)
  if (mega) {
    return `${mega[1].split('-').map(capitalizeWord).join('-')} (Mega)`
  }

  const alola = apiName.match(/^(.+)-alola$/i)
  if (alola) {
    return `${alola[1].split('-').map(capitalizeWord).join('-')} (Alolan)`
  }

  const galar = apiName.match(/^(.+)-galar$/i)
  if (galar) {
    return `${galar[1].split('-').map(capitalizeWord).join('-')} (Galarian)`
  }

  const hisui = apiName.match(/^(.+)-hisui$/i)
  if (hisui) {
    return `${hisui[1].split('-').map(capitalizeWord).join('-')} (Hisuian)`
  }

  const paldea = apiName.match(/^(.+)-paldea$/i)
  if (paldea) {
    return `${paldea[1].split('-').map(capitalizeWord).join('-')} (Paldean)`
  }

  // Zygarde special forms
  if (apiName === 'zygarde-10') return 'Zygarde (10% Forme)'
  if (apiName === 'zygarde-50') return 'Zygarde (50% Forme)'
  if (apiName === 'zygarde-complete') return 'Zygarde (Complete Forme)'

  // Default: capitalize each word separated by hyphens
  return apiName.split('-').map(capitalizeWord).join('-')
}

/**
 * Determine special status from API flags and static ID sets.
 * Checks API-provided flags first, then falls back to static data.
 *
 * @param pokemonId  The Pokemon's own ID (may be a form ID like 10034)
 * @param species    Species data from the API (includes is_legendary etc.)
 * @param speciesId  The base species ID (e.g., 6 for Charizard even when
 *                   pokemonId is 10034 for Mega Charizard X). Used for
 *                   static set lookups so form Pokemon inherit their base
 *                   species' category (Starter, Fossil, Pseudo-Legendary).
 */
export function getSpecialStatus(
  pokemonId: number,
  species: { is_legendary: boolean; is_mythical: boolean; is_baby: boolean },
  speciesId?: number
): string {
  if (species.is_legendary) return 'Legendary'
  if (species.is_mythical) return 'Mythical'
  if (species.is_baby) return 'Baby'
  if (ULTRA_BEAST_IDS.has(pokemonId)) return 'Ultra Beast'
  if (PARADOX_IDS.has(pokemonId)) return 'Paradox'

  const baseId = speciesId ?? pokemonId
  if (STARTER_IDS.has(baseId)) return 'Starter'
  if (FOSSIL_IDS.has(baseId)) return 'Fossil'
  if (PSEUDO_LEGENDARY_IDS.has(baseId)) return 'Pseudo-Legendary'
  return 'None'
}

/**
 * Determine what special forms apply to this Pokemon.
 * If the Pokemon IS a form, returns what kind of form it is.
 * If it's a base form, returns what forms it has available.
 */
export function getSpecialForms(pokemonId: number): string[] {
  if (isFormPokemon(pokemonId)) {
    const category = getFormCategory(pokemonId)
    if (category === 'Mega') return ['Is Mega Evolution']
    if (category === 'Alolan') return ['Is Alolan Form']
    if (category === 'Galarian') return ['Is Galarian Form']
    if (category === 'Hisuian') return ['Is Hisuian Form']
    if (category === 'Paldean') return ['Is Paldean Form']
    if (category === 'Zygarde') return ['Is Alternate Forme']
    return ['Is Alternate Form']
  }

  const forms: string[] = []
  if (HAS_MEGA_IDS.has(pokemonId)) forms.push('Has Mega Evolution')
  if (GIGANTAMAX_IDS.has(pokemonId)) forms.push('Has Gigantamax Form')
  if (HAS_REGIONAL_FORM_IDS.has(pokemonId)) forms.push('Has Regional Variant')
  return forms
}

/**
 * Weighted random selection: ~92% base forms, ~8% alternate forms.
 */
export function selectRandomPokemon(rng: () => number = Math.random): number {
  const FORM_CHANCE = 0.08
  const formIds = [...ALL_FORM_IDS]
  if (rng() < FORM_CHANCE && formIds.length > 0) {
    return formIds[Math.floor(rng() * formIds.length)]
  }
  return Math.floor(rng() * BASE_POKEMON_COUNT) + 1
}

/**
 * Extract species ID from a PokeAPI species URL.
 * e.g., "https://pokeapi.co/api/v2/pokemon-species/3/" -> 3
 */
export function extractSpeciesId(url: string): number {
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/)
  return match ? parseInt(match[1], 10) : 0
}
