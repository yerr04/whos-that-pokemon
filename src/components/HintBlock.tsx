import { HintType, ParsedPokemonInfo } from '@/types/game'
import { capitalize } from '@/utils/pokemon'

interface HintBlockProps {
  type: HintType
  info: ParsedPokemonInfo
  win?: boolean
}

export function HintBlock({ type, info, win = false }: HintBlockProps) {
  const commonCls =
    'bg-transparent border text-[#F2F2F2]-800 px-3 py-2 rounded-lg text-center'

  switch (type) {
    case 'bst':
      return <div className={commonCls}>BST: {info.bst}</div>
    
    case 'region':
      return <div className={commonCls}>Region: {info.region}</div>
    
    case 'ability':
      return <div className={commonCls}>Ability: {capitalize(info.ability)}</div>
    
    case 'types':
      return (
        <div className={`${commonCls} flex items-center justify-center space-x-2`}>
          <span>Type:</span>
          {info.types.map((t) => (
            <img
              key={t}
              src={`https://play.pokemonshowdown.com/sprites/types/${capitalize(t)}.png`}
              alt={t}
              className="w-12 h-4"
            />
          ))}
        </div>
      )
    
    case 'cry':
      return (
        <div className={`${commonCls} flex items-center justify-center space-x-2`}>
          <audio controls src={info.cryUrl} className="h-8" />
        </div>
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