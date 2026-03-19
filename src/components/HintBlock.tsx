import { motion } from 'framer-motion'
import { HintType, ParsedPokemonInfo } from '@/types/game'
import { capitalize, formatHeight, formatWeight } from '@/utils/pokemon'
import { TYPE_COLORS } from '@/utils/typeColors'

interface HintBlockProps {
  type: HintType
  info: ParsedPokemonInfo
  win?: boolean
  index?: number
}

const hintVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
  }),
}

function HintCard({
  label,
  children,
  motionProps,
}: {
  label: string
  children: React.ReactNode
  motionProps: Record<string, unknown>
}) {
  return (
    <motion.div
      className="pokedex-scanlines relative border-l-4 border-cyan-500 bg-[#0c1929]/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md w-full"
      {...motionProps}
    >
      <span className="block text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-0.5">
        {label}
      </span>
      <span className="block text-white font-semibold text-[15px]">{children}</span>
    </motion.div>
  )
}

export function HintBlock({ type, info, win = false, index = 0 }: HintBlockProps) {
  const motionProps =
    type === 'silhouette'
      ? {}
      : {
          initial: 'hidden' as const,
          animate: 'visible' as const,
          custom: index,
          variants: hintVariants,
        }

  switch (type) {
    case 'bst':
      return (
        <HintCard label="Base Stat Total" motionProps={motionProps}>
          {info.bst}
        </HintCard>
      )

    case 'region':
      return (
        <HintCard label="Region" motionProps={motionProps}>
          {info.region}
        </HintCard>
      )

    case 'ability':
      return (
        <HintCard label="Ability" motionProps={motionProps}>
          {capitalize(info.ability)}
        </HintCard>
      )

    case 'types':
      return (
        <motion.div
          className="pokedex-scanlines relative border-l-4 border-cyan-500 bg-[#0c1929]/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md w-full"
          {...motionProps}
        >
          <span className="block text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1.5">
            Type
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {info.types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white shadow-sm"
                style={{
                  backgroundColor: TYPE_COLORS[t] || '#68a090',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                <img
                  src={`https://play.pokemonshowdown.com/sprites/types/${capitalize(t)}.png`}
                  alt=""
                  className="w-10 h-3.5"
                />
                {capitalize(t)}
              </span>
            ))}
          </div>
        </motion.div>
      )

    case 'pokedex':
      return (
        <HintCard label="Pokédex Entry" motionProps={motionProps}>
          <span className="text-sm italic text-gray-200">
            &ldquo;{info.pokedexEntry}&rdquo;
          </span>
        </HintCard>
      )

    case 'move':
      return (
        <HintCard label="Can Learn" motionProps={motionProps}>
          {capitalize(info.move)}
        </HintCard>
      )

    case 'evolution':
      return (
        <HintCard label="Evolution Stage" motionProps={motionProps}>
          {info.evolutionStage}
        </HintCard>
      )

    case 'height':
      return (
        <HintCard label="Height" motionProps={motionProps}>
          {formatHeight(info.height)}
        </HintCard>
      )

    case 'weight':
      return (
        <HintCard label="Weight" motionProps={motionProps}>
          {formatWeight(info.weight)}
        </HintCard>
      )

    case 'specialStatus':
      return (
        <HintCard label="Special Status" motionProps={motionProps}>
          {info.specialStatus}
        </HintCard>
      )

    case 'evolutionMethod':
      return (
        <HintCard label="Evolution Method" motionProps={motionProps}>
          {info.evolutionMethod}
        </HintCard>
      )

    case 'splitEvolution':
      return (
        <HintCard label="Evolution Line" motionProps={motionProps}>
          {info.hasSplitEvolution
            ? 'Split Evolution'
            : info.evolutionStage === 'No Evolution'
              ? 'No Evolution Line'
              : 'Linear Evolution'}
        </HintCard>
      )

    case 'specialForms':
      return (
        <HintCard label="Forms" motionProps={motionProps}>
          {info.specialForms.length > 0
            ? info.specialForms.join(', ')
            : 'No Special Forms'}
        </HintCard>
      )

    case 'cry':
      return (
        <motion.div
          className="pokedex-scanlines relative border-l-4 border-cyan-500 bg-[#0c1929]/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md w-full"
          {...motionProps}
        >
          <span className="block text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1.5">
            Cry
          </span>
          <audio controls src={info.cryUrl} className="h-8 w-full max-w-xs" />
        </motion.div>
      )

    case 'silhouette':
      return (
        <div className="relative top-[13%] left-[7%] flex items-center">
          <img
            src={info.silhouetteUrl}
            id="pkmn"
            alt="silhouette"
            className="w-[40%] h-auto max-h-[60%] object-contain"
            style={{ filter: win ? 'brightness(100%)' : 'brightness(0%)' }}
          />
        </div>
      )

    default:
      return null
  }
}
