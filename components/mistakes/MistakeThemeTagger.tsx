'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
  parent_category: string
}

interface Mistake {
  id: string
  fen: string
  user_move: string
  best_move: string | null
  severity: string
  centipawn_loss: number | null
  mistake_themes?: { category_id: string }[]
}

interface Props {
  mistake: Mistake
  categories: Category[]
  onSave: (categoryIds: string[]) => void
  onClose: () => void
}

const PARENT_LABEL: Record<string, string> = {
  opening: 'Açılış',
  tactical: 'Taktik',
  strategic: 'Stratejik',
  endgame: 'Oyun Sonu',
  time_psychology: 'Zaman & Psikoloji',
}

const PARENT_ORDER = ['tactical', 'opening', 'strategic', 'endgame', 'time_psychology']

export function MistakeThemeTagger({ mistake, categories, onSave, onClose }: Props) {
  const existing = mistake.mistake_themes?.map(t => t.category_id) ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set(existing))
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/mistakes/${mistake.id}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: Array.from(selected) }),
    })
    if (res.ok) {
      toast.success('Temalar kaydedildi')
      onSave(Array.from(selected))
    } else {
      toast.error('Kayıt başarısız')
    }
    setSaving(false)
  }

  const grouped = PARENT_ORDER.reduce<Record<string, Category[]>>((acc, parent) => {
    acc[parent] = categories.filter(c => c.parent_category === parent)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <div>
            <h2 className="text-white font-semibold">Hata Teması Etiketle</h2>
            <p className="text-zinc-500 text-sm mt-0.5">
              <span className="font-mono text-zinc-300">{mistake.user_move}</span>
              {mistake.centipawn_loss !== null && (
                <span className="ml-2 text-zinc-600">−{mistake.centipawn_loss} cp</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Board */}
          <div>
            <div className="flex justify-center">
              <ChessBoard fen={mistake.fen} width={280} />
            </div>
            {mistake.best_move && (
              <p className="text-center text-zinc-500 text-xs mt-2">
                En iyi hamle: <span className="text-blue-400 font-mono font-semibold">{mistake.best_move}</span>
              </p>
            )}
          </div>

          {/* Category selection */}
          <div className="space-y-4">
            {PARENT_ORDER.map(parent => (
              <div key={parent}>
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  {PARENT_LABEL[parent]}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {grouped[parent]?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggle(cat.id)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        selected.has(cat.id)
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-zinc-500 text-sm">
            {selected.size} tema seçildi
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-400">
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
