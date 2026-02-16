'use client'

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { useUserStats, type ModeTotal, type HintTotal, type GameSessionRow } from '@/hooks/useUserStats'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
)

const MODE_LABELS: Record<string, string> = {
  daily: 'Daily Challenge',
  unlimited: 'Unlimited',
}

const HINT_LABELS: Record<string, string> = {
  bst: 'BST',
  region: 'Region',
  ability: 'Ability',
  types: 'Types',
  pokedex: 'Pokédex',
  move: 'Move',
  evolution: 'Evolution',
  height: 'Height',
  weight: 'Weight',
  cry: 'Cry',
  silhouette: 'Silhouette',
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#e5e7eb' } },
    tooltip: { bodyColor: '#e5e7eb', titleColor: '#9ca3af' },
  },
  scales: {} as Record<string, { grid?: { color: string }; ticks?: { color: string } }>,
}

function buildWinRateByMode(modeTotals: ModeTotal[]) {
  const labels = modeTotals.map((m) => MODE_LABELS[m.mode] ?? m.mode)
  const wins = modeTotals.map((m) => m.total_wins)
  const colors = ['#22d3ee', '#a78bfa']
  return {
    labels,
    datasets: [
      {
        data: wins,
        backgroundColor: colors,
        borderColor: ['#0e7490', '#6d28d9'],
        borderWidth: 2,
      },
    ],
  }
}

function buildHintPerformance(hintTotals: HintTotal[]) {
  const labels = hintTotals.map((h) => HINT_LABELS[h.hint_type] ?? h.hint_type)
  const winRates = hintTotals.map((h) =>
    h.total_uses > 0 ? Math.round((h.wins_with_hint / h.total_uses) * 100) : 0
  )
  return {
    labels,
    datasets: [
      {
        label: 'Win rate %',
        data: winRates,
        backgroundColor: 'rgba(34, 211, 238, 0.6)',
        borderColor: '#22d3ee',
        borderWidth: 1,
      },
    ],
  }
}

function buildGuessesDistribution(sessions: GameSessionRow[]) {
  const wins = sessions.filter((s) => s.win)
  const buckets = [1, 2, 3, 4, 5, 6, 7]
  const data = buckets.map((g) => wins.filter((s) => s.guesses_made === g).length)
  return {
    labels: buckets.map((g) => `${g} guess${g !== 1 ? 'es' : ''}`),
    datasets: [
      {
        label: 'Wins',
        data,
        backgroundColor: 'rgba(167, 139, 250, 0.6)',
        borderColor: '#a78bfa',
        borderWidth: 1,
      },
    ],
  }
}

export function StatsDashboard() {
  const { loading, modeTotals, hintTotals, recentSessions } = useUserStats()

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="text-white/70">Loading your stats…</p>
      </div>
    )
  }

  const totalGames = modeTotals.reduce((s, m) => s + m.total_games, 0)
  const totalWins = modeTotals.reduce((s, m) => s + m.total_wins, 0)
  const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0
  const maxStreak = Math.max(0, ...modeTotals.map((m) => m.max_streak))
  const currentStreak = modeTotals.reduce((s, m) => s + m.current_streak, 0)

  const hasModeData = modeTotals.length > 0
  const hasHintData = hintTotals.length > 0
  const hasSessionData = recentSessions.some((s) => s.win)

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm font-medium text-white/60">Total games</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalGames}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm font-medium text-white/60">Win rate</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">{overallWinRate}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm font-medium text-white/60">Current streak</p>
          <p className="mt-1 text-2xl font-bold text-white">{currentStreak}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm font-medium text-white/60">Best streak</p>
          <p className="mt-1 text-2xl font-bold text-violet-400">{maxStreak}</p>
        </div>
      </div>

      {!hasModeData && !hasHintData ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/70">
            Play Daily Challenge or Unlimited mode to see your stats here.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Win distribution by mode */}
          {hasModeData && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-white">Wins by mode</h3>
              <div className="h-[240px]">
                <Doughnut
                  data={buildWinRateByMode(modeTotals)}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { position: 'bottom', labels: { color: '#e5e7eb' } },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Guesses to win distribution */}
          {hasSessionData && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Guesses needed to win (recent games)
              </h3>
              <div className="h-[240px]">
                <Bar
                  data={buildGuessesDistribution(recentSessions)}
                  options={{
                    ...chartOptions,
                    scales: {
                      x: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#9ca3af' },
                      },
                      y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#9ca3af' },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Hint performance (full width if only this one, or span) */}
          {hasHintData && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:col-span-2">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Hint performance (win rate when using each hint)
              </h3>
              <div className="h-[280px]">
                <Bar
                  data={buildHintPerformance(hintTotals)}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                    scales: {
                      x: {
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#9ca3af' },
                      },
                      y: {
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { color: '#9ca3af' },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
