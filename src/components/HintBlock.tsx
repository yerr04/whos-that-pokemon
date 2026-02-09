import { motion } from 'framer-motion'
import { HintType, ParsedPokemonInfo } from '@/types/game'
import { capitalize, formatHeight, formatWeight } from '@/utils/pokemon'

interface HintBlockProps {
  type: HintType
  info: ParsedPokemonInfo
  win?: boolean
  /** Optional index for stagger animation (e.g. 0, 1, 2…) */
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

export function HintBlock({ type, info, win = false, index = 0 }: HintBlockProps) {
  const commonCls =
    'border-2 border-cyan-500 text-font px-3 py-2 rounded-full text-center shadow-md w-full py-4'

  const motionProps =
    type === 'silhouette'
      ? {}
      : {
          initial: 'hidden',
          animate: 'visible',
          custom: index,
          variants: hintVariants,
        }

  switch (type) {
    case 'bst':
      return (
        <motion.div className={commonCls} {...motionProps}>
          BST: {info.bst}
        </motion.div>
      )
    
    case 'region':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Region: {info.region}
        </motion.div>
      )

    case 'ability':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Ability: {capitalize(info.ability)}
        </motion.div>
      )

    case 'types':
      return (
        <motion.div
          className={`${commonCls} flex items-center justify-center space-x-2`}
          {...motionProps}
        >
          <span>Type:</span>
          {info.types.map((t) => (
            <img
              key={t}
              src={`https://play.pokemonshowdown.com/sprites/types/${capitalize(t)}.png`}
              alt={t}
              className="w-12 h-4"
            />
          ))}
        </motion.div>
      )

    case 'pokedex':
      return (
        <motion.div className={`${commonCls} text-sm`} {...motionProps}>
          "{info.pokedexEntry}"
        </motion.div>
      )

    case 'move':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Can Learn: {capitalize(info.move)}
        </motion.div>
      )

    case 'evolution':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Evolution: {info.evolutionStage}
        </motion.div>
      )

    case 'height':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Height: {formatHeight(info.height)}
        </motion.div>
      )

    case 'weight':
      return (
        <motion.div className={commonCls} {...motionProps}>
          Weight: {formatWeight(info.weight)}
        </motion.div>
      )

    case 'cry':
      return (
        <motion.div
          className={`${commonCls} flex items-center justify-center space-x-2`}
          {...motionProps}
        >
          <audio controls src={info.cryUrl} className="h-8" />
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