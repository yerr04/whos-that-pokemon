"use client"
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GameInterface } from '@/components/GameInterface'
import { useDailyChallenge } from '@/hooks/useDailyChallenge'
import { useAuth } from '@/hooks/useAuth'
import { isValidArchiveDateKey } from '@/utils/dailyChallenge'

/**
 * /daily plays today's challenge; /daily?date=YYYY-MM-DD replays a past one
 * from the archive. Archive games record under their historical date (once
 * per date) but never affect the streak — the server enforces both.
 */
function DailyChallengeInner() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const archiveDateKey = isValidArchiveDateKey(dateParam) ? dateParam : undefined

  const gameState = useDailyChallenge(archiveDateKey)
  const { user } = useAuth()

  return (
    <>
      {gameState.isArchive && (
        <div className="mx-auto max-w-3xl px-4 pt-24 -mb-20 md:pt-28 md:-mb-24 relative z-10">
          <Link
            href="/daily/archive"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            ← Back to archive
          </Link>
        </div>
      )}
      <GameInterface
        {...gameState}
        title={gameState.isArchive ? 'Daily Archive' : 'Daily Challenge'}
        subtitle={gameState.isArchive ? gameState.dateKey : undefined}
        guesses={gameState.guesses}
        timeUntilNext={gameState.isArchive ? undefined : gameState.timeUntilNext}
        debugMode={gameState.debugMode}
        setDebugMode={gameState.setDebugMode}
        difficulty={gameState.difficulty}
        maxGuesses={gameState.maxGuesses}
        mode="daily"
        dateKey={gameState.dateKey}
        streak={gameState.streak}
        streakFreezes={gameState.streakFreezes}
        newAchievements={gameState.newAchievements}
        isArchive={gameState.isArchive}
        isGuest={!user}
      />
    </>
  )
}

export default function DailyChallenge() {
  return (
    <Suspense fallback={null}>
      <DailyChallengeInner />
    </Suspense>
  )
}
