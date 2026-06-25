'use client'

import { useState } from 'react'
import { RepertoireLine } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineForm } from './LineForm'
import { cn } from '@/lib/utils'
import { Plus, BookOpen, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialLines: RepertoireLine[]
}

function confidenceColor(score: number) {
  if (score >= 75) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}
function confidenceBar(score: number) {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function WinRate({ w, d, l }: { w: number; d: number; l: number }) {
  const total = w + d + l
  if (total === 0) return <span className="text-zinc-600 text-xs">—</span>
  const wr = Math.round((w / total) * 100)
  return (
    <span className={cn('text-xs font-medium', wr >= 50 ? 'text-emerald-400' : 'text-red-400')}>
      %{wr} ({w}K/{d}B/{l}M)
    </span>
  )
}

function LineCard({
  line,
  onEdit,
  onDelete,
}: {
  line: RepertoireLine
  onEdit: (l: RepertoireLine) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`"${line.name}" silinecek. Emin misin?`)) return
    setDeleting(true)
    await fetch(`/api/repertoire/${line.id}`, { method: 'DELETE' })
    onDelete(line.id)
    toast.success('Satır silindi')
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
        <span className="text-lg flex-shrink-0">{line.color === 'white' ? '♔' : '♚'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium">{line.name}</span>
            {line.eco_code && <span className="text-zinc-500 text-xs">({line.eco_code})</span>}
            {!line.is_active && <Badge variant="outline" className="border-zinc-700 text-zinc-600 text-xs">pasif</Badge>}
          </div>
          {line.moves && (
            <p className="text-zinc-500 text-xs font-mono mt-0.5 truncate">{line.moves}</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className={cn('text-sm font-bold', confidenceColor(line.confidence_score))}>
              {line.confidence_score}/100
            </div>
            <WinRate w={line.wins} d={line.draws} l={line.losses} />
          </div>
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => onEdit(line)} className="h-7 w-7 p-0 text-zinc-500 hover:text-white">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 space-y-3 pt-3">
          {/* Confidence bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-500">Güven skoru</span>
              <span className={confidenceColor(line.confidence_score)}>{line.confidence_score}/100</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', confidenceBar(line.confidence_score))}
                style={{ width: `${line.confidence_score}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {line.main_idea && (
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">Ana Fikir</p>
                <p className="text-zinc-300 text-sm">{line.main_idea}</p>
              </div>
            )}
            {line.typical_plan && (
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">Tipik Plan</p>
                <p className="text-zinc-300 text-sm">{line.typical_plan}</p>
              </div>
            )}
            {line.pawn_structure && (
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">Piyon Yapısı</p>
                <p className="text-zinc-300 text-sm">{line.pawn_structure}</p>
              </div>
            )}
            {line.dangerous_ideas && (
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">Tehlikeli Fikirler</p>
                <p className="text-zinc-300 text-sm text-red-300">{line.dangerous_ideas}</p>
              </div>
            )}
          </div>

          {line.notes && (
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide mb-1">Notlar</p>
              <p className="text-zinc-400 text-sm">{line.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span>{line.games_played} oyun</span>
            {line.next_review_at && (
              <span>Tekrar: {new Date(line.next_review_at).toLocaleDateString('tr-TR')}</span>
            )}
            {line.last_played_at && (
              <span>Son: {new Date(line.last_played_at).toLocaleDateString('tr-TR')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function RepertoireContent({ initialLines }: Props) {
  const [lines, setLines] = useState(initialLines)
  const [showForm, setShowForm] = useState(false)
  const [editingLine, setEditingLine] = useState<RepertoireLine | null>(null)
  const [defaultColor, setDefaultColor] = useState<'white' | 'black'>('white')

  const whiteLines = lines.filter(l => l.color === 'white')
  const blackLines = lines.filter(l => l.color === 'black')

  function handleSaved(line: RepertoireLine) {
    setLines(prev => {
      const exists = prev.find(l => l.id === line.id)
      return exists ? prev.map(l => l.id === line.id ? line : l) : [line, ...prev]
    })
    setShowForm(false)
    setEditingLine(null)
  }

  function handleDeleted(id: string) {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  function openAdd(color: 'white' | 'black') {
    setDefaultColor(color)
    setEditingLine(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-green-400" />
            Açılış Repertuarı
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{lines.length} satır · {whiteLines.length} beyaz · {blackLines.length} siyah</p>
        </div>
        <Button onClick={() => openAdd('white')} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
          <Plus className="w-4 h-4" /> Satır Ekle
        </Button>
      </div>

      <Tabs defaultValue="white">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="white" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 gap-2">
            ♔ Beyaz ({whiteLines.length})
          </TabsTrigger>
          <TabsTrigger value="black" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 gap-2">
            ♚ Siyah ({blackLines.length})
          </TabsTrigger>
        </TabsList>

        {(['white', 'black'] as const).map(color => (
          <TabsContent key={color} value={color} className="mt-4 space-y-2">
            {(color === 'white' ? whiteLines : blackLines).length === 0 ? (
              <div className="text-center py-16 bg-zinc-900 rounded-2xl border border-zinc-800">
                <div className="text-4xl mb-3">{color === 'white' ? '♔' : '♚'}</div>
                <p className="text-zinc-400 font-medium">
                  {color === 'white' ? 'Beyaz' : 'Siyah'} repertuarı henüz boş
                </p>
                <p className="text-zinc-600 text-sm mt-1 mb-4">Hangi açılışları oynadığını ekle.</p>
                <Button onClick={() => openAdd(color)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
                  <Plus className="w-4 h-4" /> İlk Satırı Ekle
                </Button>
              </div>
            ) : (
              <>
                {(color === 'white' ? whiteLines : blackLines).map(line => (
                  <LineCard
                    key={line.id}
                    line={line}
                    onEdit={l => { setEditingLine(l); setShowForm(true) }}
                    onDelete={handleDeleted}
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() => openAdd(color)}
                  className="w-full border-zinc-800 border-dashed text-zinc-500 hover:text-white hover:border-zinc-600 gap-2"
                >
                  <Plus className="w-4 h-4" /> Yeni Satır Ekle
                </Button>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {showForm && (
        <LineForm
          line={editingLine}
          defaultColor={defaultColor}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditingLine(null) }}
        />
      )}
    </div>
  )
}
