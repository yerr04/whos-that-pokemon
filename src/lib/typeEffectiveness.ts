type Type = 
    | "Normal" | "Fire" | "Water" | "Electric" | "Grass"
    | "Ice" | "Fighting" | "Poison" | "Ground" | "Flying"
    | "Psychic" | "Bug" | "Rock" | "Ghost" | "Dragon"
    | "Dark" | "Steel" | "Fairy";

const TYPES: Type[] = [
    "Normal", "Fire", "Water", "Electric", "Grass",
    "Ice", "Fighting", "Poison", "Ground", "Flying",
    "Psychic", "Bug", "Rock", "Ghost", "Dragon",
    "Dark", "Steel", "Fairy"
];

// Type effectiveness chart
const E: Record<Type, Partial<Record<Type, number>>> = {
  Normal:  { Rock:0.5, Steel:0.5, Ghost:0 },
  Fire:    { Fire:0.5, Water:0.5, Rock:0.5, Dragon:0.5, Grass:2, Ice:2, Bug:2, Steel:2 },
  Water:   { Water:0.5, Grass:0.5, Dragon:0.5, Fire:2, Ground:2, Rock:2 },
  Electric:{ Electric:0.5, Grass:0.5, Dragon:0.5, Ground:0, Water:2, Flying:2 },
  Grass:   { Fire:0.5, Grass:0.5, Poison:0.5, Flying:0.5, Bug:0.5, Dragon:0.5, Steel:0.5, Water:2, Ground:2, Rock:2 },
  Ice:     { Fire:0.5, Water:0.5, Ice:0.5, Steel:0.5, Grass:2, Ground:2, Flying:2, Dragon:2 },
  Fighting:{ Poison:0.5, Flying:0.5, Psychic:0.5, Bug:0.5, Fairy:0.5, Ghost:0, Normal:2, Ice:2, Rock:2, Dark:2, Steel:2 },
  Poison:  { Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0, Grass:2, Fairy:2 },
  Ground:  { Grass:0.5, Bug:0.5, Flying:0, Fire:2, Electric:2, Poison:2, Rock:2, Steel:2 },
  Flying:  { Electric:0.5, Rock:0.5, Steel:0.5, Grass:2, Fighting:2, Bug:2 },
  Psychic: { Psychic:0.5, Steel:0.5, Dark:0, Fighting:2, Poison:2 },
  Bug:     { Fire:0.5, Fighting:0.5, Poison:0.5, Flying:0.5, Ghost:0.5, Steel:0.5, Fairy:0.5,
             Grass:2, Psychic:2, Dark:2 },
  Rock:    { Fighting:0.5, Ground:0.5, Steel:0.5, Fire:2, Ice:2, Flying:2, Bug:2 },
  Ghost:   { Dark:0.5, Normal:0, Psychic:2, Ghost:2 },
  Dragon:  { Steel:0.5, Fairy:0, Dragon:2 },
  Dark:    { Fighting:0.5, Dark:0.5, Fairy:0.5, Psychic:2, Ghost:2 },
  Steel:   { Fire:0.5, Water:0.5, Electric:0.5, Steel:0.5, Ice:2, Rock:2, Fairy:2 },
  Fairy:   { Fire:0.5, Poison:0.5, Steel:0.5, Fighting:2, Dragon:2, Dark:2 },
};

// return weakness grouped by effectiveness
function calcEffectiveness(def1: Type, def2?: Type) {
    const mul: Record<Type, number> = Object.fromEntries(TYPES.map(t => [t, 1])) as Record<Type, number>;
    for (const atk of TYPES) {
        const m1 = E[atk][def1] ?? 1;
        const m2 = def2 ? (E[atk][def2] ?? 1) : 1;
        mul[atk] = m1 * m2;
    }
    const out = {
        quadWeak: TYPES.filter(t => mul[t] === 4),
        weak: TYPES.filter(t => mul[t] === 2),
        resist: TYPES.filter(t => mul[t] === 0.5),
        quadResist: TYPES.filter(t => mul[t] === 0.25),
        immune: TYPES.filter(t => mul[t] === 0),
    };
    return out;
}