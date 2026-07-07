import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient'

export const metadata = {
  title: 'Leaderboard — PokéNerdle',
  description: 'See the top PokéNerdle trainers by hints used, daily streak, and games played.',
}

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 md:pt-28">
      <LeaderboardClient />
    </div>
  )
}
