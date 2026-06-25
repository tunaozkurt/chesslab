'use client'

import { useState } from 'react'
import { TacticPosition } from '@/types'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Sword, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { initialPositions: TacticPosition[] }

const MOTIFS = [
  'Çatal', 'Şiş', 'Açmaz', 'Ara hamle (Zwischenzug)', 'Çifte saldırı',
  'Savunmasız taş', 'Arka sıra matı', 'Keşif saldırısı', 'Deflection',
  'Overload', 'Greek Gift', 'Taş sıkışması', 'Sırt sırta mat', 'Diğer',
]

const BLANK_FORM = { fen: '', motif: '', solution: '', difficulty: 3, source: 'own_game', notes: '' }

export function TacticsContent({ initialPositions }: Props) {
  const [positions, setPositions] = useState(initialPositions)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [fenPreview, setFenPreview] = useState('')
  const [filterMotif, setFilterMotif] = useState('all')

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  function handleFenChange(fen: string) {
    set('fen', fen)
    const parts = fen.trim().split(' ')
    if (parts.length >= 1 && parts[0].includes('/')) setFenPreview(fen.trim())
    else setFenPreview('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fen.trim()) { toast.error('FEN gerekli'); return }
    setSaving(true)
    const res = await fetch('/api/tactics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      setPositions(prev => [data, ...prev])
      setForm(BLANK_FORM)
      setFenPreview('')
      setShowForm(false)
      toast.success('Taktik eklendi ve çalışma kuyruğuna alındı')
    } else {
      toast.error('Eklenemedi')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu taktik pozisyonu silinecek.')) return
    await fetch(`/api/tactics/${id}`, { method: 'DELETE' })
    setPositions(prev => prev.filter(p => p.id !== id))
    toast.success('Silindi')
  }

  // Motif frequency
  const motifCount: Record<string, number> = {}
  for (const p of positions) {
    if (p.motif) motifCount[p.motif] = (motifCount[p.motif] ?? 0) + 1
  }

  const allMotifs = Object.keys(motifCount).sort((a, b) => motifCount[b] - motifCount[a])
  const filtered = filterMotif === 'all' ? positions : positions.filter(p => p.motif === filterMotif)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sword className="w-6 h-6 text-orange-400" />
            Taktik Defteri
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{positions.length} taktik pozisyonu</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
          <Plus className="w-4 h-4" /> Taktik Ekle
        </Button>
      </div>

      {/* Motif stats */}
      {allMotifs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterMotif('all')}
            className={cn('text-xs px-3 py-1 rounded-full border transition-colors',
              filterMotif === 'all' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300')}>
            Tümü ({positions.length})
          </button>
          {allMotifs.map(m => (
            <button key={m} onClick={() => setFilterMotif(m)}
              className={cn('text-xs px-3 py-1 rounded-full border transition-colors',
                filterMotif === m ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300')}>
              {m} ({motifCount[m]})
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-5xl mb-3">⚔️</div>
          <p className="text-zinc-400 font-medium">Henüz taktik pozisyonu yok</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Kendi oyunlarından veya çalışmalarından taktikleri buraya ekle.</p>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Plus className="w-4 h-4" /> İlk Taktiği Ekle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(pos => (
            <Card key={pos.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="p-3 flex justify-center bg-zinc-950">
                <ChessBoard fen={pos.fen} width={200} />
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {pos.motif && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs mb-1">
                        {pos.motif}
                      </Badge>
                    )}
                    <p className="text-zinc-500 text-xs">{'★'.repeat(pos.difficulty)}{'☆'.repeat(5 - pos.difficulty)}</p>
                  </div>
                  <button onClick={() => handleDelete(pos.id)} className="text-zinc-600 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {pos.solution && (
                  <div className="bg-zinc-800 rounded-lg px-2 py-1.5">
                    <p className="text-zinc-500 text-xs mb-0.5">Çözüm</p>
                    <p className="text-emerald-400 text-xs font-mono">{pos.solution}</p>
                  </div>
                )}
                {pos.notes && <p className="text-zinc-500 text-xs line-clamp-2">{pos.notes}</p>}
                <div className="flex items-center gap-3 text-zinc-700 text-xs">
                  <span>{pos.success_count}✓ {pos.fail_count}✗</span>
                  {pos.source === 'own_game' && <span>Kendi oyunundan</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="text-white font-semibold">Yeni Taktik Pozisyonu</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">FEN *</Label>
                    <Textarea value={form.fen} onChange={e => handleFenChange(e.target.value)}
                      placeholder="Pozisyonun FEN kodunu yapıştır..."
                      rows={3} className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs placeholder:text-zinc-600 resize-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Taktik Motifi</Label>
                    <Select value={form.motif} onValueChange={v => set('motif', v ?? '')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seç..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {MOTIFS.map(m => <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Çözüm (hamle veya açıklama)</Label>
                    <Input value={form.solution} onChange={e => set('solution', e.target.value)}
                      placeholder="Nxf7+!, 1.Rxd8+ Rxd8 2.Rxd8#..."
                      className="bg-zinc-800 border-zinc-700 text-white font-mono placeholder:text-zinc-500 focus:border-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Zorluk</Label>
                      <Select value={String(form.difficulty)} onValueChange={v => set('difficulty', parseInt(v ?? '3'))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)} className="text-white">{'★'.repeat(n)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Kaynak</Label>
                      <Select value={form.source} onValueChange={v => set('source', v ?? 'own_game')}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="own_game" className="text-white">Kendi oyunum</SelectItem>
                          <SelectItem value="manual" className="text-white">Manuel</SelectItem>
                          <SelectItem value="book" className="text-white">Kitap / Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Notlar</Label>
                    <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                      placeholder="Bu taktik hakkında notlar..." rows={2}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:border-amber-500" />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-start gap-3">
                  <Label className="text-zinc-300 self-start">Önizleme</Label>
                  {fenPreview ? (
                    <ChessBoard fen={fenPreview} width={220} />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-zinc-800 rounded-xl flex items-center justify-center">
                      <p className="text-zinc-600 text-xs text-center px-4">FEN gir, tahta burada görünür</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-zinc-700 text-zinc-400">İptal</Button>
                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  {saving ? 'Ekleniyor...' : 'Ekle ve Kuyruğa Al'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
