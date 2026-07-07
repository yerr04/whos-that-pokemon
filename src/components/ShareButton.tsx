'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { buildShareText, type ShareData } from '@/utils/share'

type Props = Omit<ShareData, 'url'>

type ShareStatus = 'idle' | 'shared' | 'copied' | 'error'

export function ShareButton(props: Props) {
  const [status, setStatus] = useState<ShareStatus>('idle')

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : undefined
    const text = buildShareText({ ...props, url })

    try {
      // Prefer the native share sheet on supported devices (mostly mobile).
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text })
        setStatus('shared')
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setStatus('copied')
      } else {
        throw new Error('Sharing not supported')
      }
    } catch (err) {
      // AbortError fires when the user dismisses the native share sheet; ignore it.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      // Last-resort clipboard fallback before surfacing an error.
      try {
        await navigator.clipboard.writeText(text)
        setStatus('copied')
      } catch {
        setStatus('error')
      }
    }

    window.setTimeout(() => setStatus('idle'), 2000)
  }

  const label =
    status === 'copied'
      ? 'Copied to clipboard!'
      : status === 'shared'
      ? 'Shared!'
      : status === 'error'
      ? 'Could not share'
      : 'Share Result'

  return (
    <motion.button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500 text-[#0d1a26] font-bold hover:bg-cyan-400 transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
