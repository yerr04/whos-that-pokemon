import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-80"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#1f2b3d] rounded-lg p-6 max-w-md mx-4 border-2 border-[#55c58d] transition-discrete">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
        >
          ×
        </button>
        
        {children}
      </div>
    </div>
  )
}

export function RulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4 text-[#55c58d]">How to Play</h2>
        
        <div className="space-y-3 text-sm">
          <p>
            🎯 <strong>Goal:</strong> Guess the Pokémon with as few hints as possible!
          </p>
          
          <div>
            <p className="font-semibold mb-2">📝 Hint Order:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li><strong>First guess:</strong> No hints (blind guess)</li>
              <li><strong>BST:</strong> Base stat total--this is the sum of all of their stats!</li>
              <li><strong>Region:</strong> Where the Pokémon originates</li>
              <li><strong>Ability:</strong> One of their abilities</li>
              <li><strong>Type:</strong> Their type(s)</li>
              <li><strong>Cry:</strong> Their signature sound</li>
              <li><strong>Silhouette:</strong> Last hint--better make it count!</li>
            </ol>
          </div>
          
          <p>
            ⏰ You have <strong>7 total guesses</strong> to identify the Pokémon!
          </p>
          
          <p className="text-xs text-gray-300 mt-4">
            💡 <em>Tip: Pay attention to each hint - they'll help narrow down your options!</em>
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-[#206d46] text-white rounded hover:bg-[#55c58d] transition-colors font-bold"
        >
          START PLAYING
        </button>
      </div>
    </Modal>
  )
}