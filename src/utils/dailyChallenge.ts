// src/utils/dailyChallenge.ts
export function getDailyPokemonId(): number {
  const now = new Date()
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  
  console.log('Current time:', now.toISOString())
  console.log('EST time:', est.toISOString())
  console.log('EST hours:', est.getHours())
  
  // If it's before 10 AM, use previous day
  if (est.getHours() < 10) {
    est.setDate(est.getDate() - 1)
    console.log('Before 10 AM, using previous day:', est.toISOString())
  }
  
  // Use date as seed for random Pokemon generation
  const dateString = est.toISOString().split('T')[0] // YYYY-MM-DD
  console.log('Date string:', dateString)
  
  // Create a more robust seeded random function using the date
  const seed = dateString.replace(/-/g, '') // YYYYMMDD
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // Use the same random generation algorithm as unlimited mode
  const seededRandom = () => {
    hash = (hash * 1664525 + 1013904223) % Math.pow(2, 32)
    return Math.abs(hash) / Math.pow(2, 32)
  }
  
  // Generate multiple random calls to get better distribution
  // (same pattern as unlimited mode would naturally do)
  seededRandom() // Throw away first value for better randomness
  seededRandom() // Throw away second value
  
  // Generate random Pokemon ID using the EXACT same logic as unlimited mode
  const pokemonId = Math.floor(seededRandom() * 1025) + 1
  
  console.log('Seed:', seed)
  console.log('Hash:', hash)
  console.log('Pokemon ID:', pokemonId)
  
  return pokemonId
}

export function getTimeUntilNextChallenge(): { hours: number; minutes: number; seconds: number } {
  const now = new Date()
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  
  // Next 10 AM EST
  const nextReset = new Date(est)
  nextReset.setHours(10, 0, 0, 0)
  
  // If it's past 10 AM today, next reset is tomorrow
  if (est.getHours() >= 10) {
    nextReset.setDate(nextReset.getDate() + 1)
  }
  
  const diff = nextReset.getTime() - est.getTime()
  
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  }
}

export function getTodaysDateKey(): string {
  const now = new Date()
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  
  console.log('Getting date key - EST time:', est.toISOString())
  console.log('EST hours:', est.getHours())
  
  if (est.getHours() < 10) {
    est.setDate(est.getDate() - 1)
    console.log('Before 10 AM, using previous day for date key:', est.toISOString())
  }
  
  const dateKey = est.toISOString().split('T')[0]
  console.log('Date key:', dateKey)
  
  return dateKey
}