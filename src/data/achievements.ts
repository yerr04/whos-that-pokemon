// src/data/achievements.ts
//
// Display metadata for achievements. The unlock CONDITIONS are evaluated
// server-side in check_achievements() (migration/add_engagement_features.sql)
// so they can't be forged — the ids here must stay in sync with that function.

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_win',
    name: 'First Catch',
    description: 'Win your first game.',
    icon: '🎣',
  },
  {
    id: 'first_guess_win',
    name: 'One Shot',
    description: 'Guess a Pokémon correctly on the very first try.',
    icon: '🎯',
  },
  {
    id: 'hard_win',
    name: 'No Training Wheels',
    description: 'Win a game on Hard difficulty.',
    icon: '🧗',
  },
  {
    id: 'streak_3',
    name: 'Warming Up',
    description: 'Reach a 3-day daily streak.',
    icon: '✨',
  },
  {
    id: 'streak_7',
    name: 'On Fire',
    description: 'Reach a 7-day daily streak.',
    icon: '🔥',
  },
  {
    id: 'streak_30',
    name: 'Legendary Dedication',
    description: 'Reach a 30-day daily streak.',
    icon: '🌟',
  },
  {
    id: 'games_50',
    name: 'Regular',
    description: 'Finish 50 games.',
    icon: '🎮',
  },
  {
    id: 'games_100',
    name: 'Century Club',
    description: 'Finish 100 games.',
    icon: '💯',
  },
  {
    id: 'games_500',
    name: 'Pokémon Professor',
    description: 'Finish 500 games.',
    icon: '🎓',
  },
  {
    id: 'daily_25',
    name: 'Daily Devotee',
    description: 'Win 25 daily challenges.',
    icon: '📅',
  },
  {
    id: 'unlimited_50',
    name: 'Marathon Trainer',
    description: 'Win 50 unlimited games.',
    icon: '🏃',
  },
  {
    id: 'freeze_collector',
    name: 'Cool Under Pressure',
    description: 'Earn 3 streak freezes.',
    icon: '🧊',
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
