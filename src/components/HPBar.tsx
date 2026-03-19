interface HPBarProps {
  remaining: number
  max: number
  win?: boolean
}

export function HPBar({ remaining, max, win }: HPBarProps) {
  const pct = (remaining / max) * 100

  const barColor = win
    ? '#4ade80'
    : pct > 50
      ? '#4ade80'
      : pct > 25
        ? '#facc15'
        : '#ef4444'

  return (
    <div className="flex items-center gap-2 mt-3 w-full">
      <span className="text-[11px] font-bold text-yellow-300 tracking-wider select-none">
        HP
      </span>

      <div className="flex-1 h-[18px] bg-[#1a1a2e] rounded-[3px] border-2 border-[#3a3a5c] overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
        <div
          className="h-full rounded-[2px] transition-all duration-700 ease-out relative"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 8px ${barColor}60`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent h-[45%]" />
        </div>
      </div>

      <span className="text-[11px] font-bold text-gray-400 tabular-nums min-w-[3ch] text-right select-none">
        {remaining}/{max}
      </span>
    </div>
  )
}
