// src/utils/dailyChallenge.ts
export function getDailyPokemonId(): number {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // If it's before 10 AM, use previous day
  if (est.getHours() < 10) {
    est.setDate(est.getDate() - 1);
  }
  
  // Use date as seed for consistent daily Pokemon
  const dateString = est.toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = dateString.split('-').join(''); // YYYYMMDD
  
  // Convert date to Pokemon ID (1-1025)
  const pokemonId = (parseInt(seed) % 1025) + 1;
  
  return pokemonId;
}

export function getTimeUntilNextChallenge(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // Next 10 AM EST
  const nextReset = new Date(est);
  nextReset.setHours(10, 0, 0, 0);
  
  // If it's past 10 AM today, next reset is tomorrow
  if (est.getHours() >= 10) {
    nextReset.setDate(nextReset.getDate() + 1);
  }
  
  const diff = nextReset.getTime() - est.getTime();
  
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

export function getTodaysDateKey(): string {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  if (est.getHours() < 10) {
    est.setDate(est.getDate() - 1);
  }
  
  return est.toISOString().split('T')[0];
}