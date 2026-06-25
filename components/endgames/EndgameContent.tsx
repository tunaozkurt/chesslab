'use client'

import { useState } from 'react'
import { EndgamePosition } from '@/types'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Target, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { initialPositions: EndgamePosition[] }

const CATEGORIES = ['Temel Matlar', 'Piyon Oyun Sonları', 'Kale Oyun Sonları', 'Fil Oyun Sonları', 'At Oyun Sonları', 'Vezir Oyun Sonları', 'Beraberlik Teknikleri', 'Diğer']
const GOAL_LABEL: Record<string, string> = { win: 'Kazan', draw: 'Berabere yap', defend: 'Savun' }
const GOAL_COLOR: Record<string, string> = { win: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', draw: 'text-amber-400 border-amber-500/30 bg-amber-500/10', defend: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }

const BLANK_FORM = { fen: '', category: '', theme: '', goal: 'win' as const, difficulty: 3, source: 'manual', notes: '' }

export function EndgameContent({ initialPositions }: Props) {
  const [positions, setPositions] = useState(initialPositions)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [fenPreview, setFenPreview] = useState('')
  const [filterCat, setFilterCat] = useState('all')

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  function handleFenChange(fen: string) {
    set('fen', fen)
    try {
      const parts = fen.trim().split(' ')
      if (parts.length >= 1 && parts[0].includes('/')) setFenPreview(fen.trim())
    } catch { setFenPreview('') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fen.trim()) { toast.error('FEN gerekli'); return }
    setSaving(true)
    const res = await fetch('/api/endgames', {
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
      toast.success('Pozisyon eklendi ve çalışma kuyruğuna alındı')
    } else {
      toast.error('Eklenemedi')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu pozisyon silinecek.')) return
    await fetch(`/api/endgames/${id}`, { method: 'DELETE' })
    setPositions(prev => prev.filter(p => p.id !== id))
    toast.success('Silindi')
  }

  const filtered = filterCat === 'all' ? positions : positions.filter(p => p.category === filterCat)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            Oyun Sonu Laboratuvarı
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{positions.length} pozisyon</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
          <Plus className="w-4 h-4" /> Pozisyon Ekle
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {['all', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={cn('text-xs px-3 py-1 rounded-full border transition-colors',
              filterCat === cat ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300')}>
            {cat === 'all' ? 'Tümü' : cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-5xl mb-3">♚</div>
          <p className="text-zinc-400 font-medium">Henüz pozisyon yok</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Öğrenmek istediğin oyun sonu pozisyonlarını ekle.</p>
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <Plus className="w-4 h-4" /> İlk Pozisyonu Ekle
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
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{pos.theme ?? pos.category ?? 'Genel'}</p>
                    <p className="text-zinc-500 text-xs">{pos.category}</p>
                  </div>
                  <button onClick={() => handleDelete(pos.id)} className="text-zinc-600 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {pos.goal && (
                    <span className={cn('text-xs px-2 py-0.5 rounded border', GOAL_COLOR[pos.goal])}>
                      {GOAL_LABEL[pos.goal]}
                    </span>
                  )}
                  <span className="text-zinc-600 text-xs">{'★'.repeat(pos.difficulty)}{'☆'.repeat(5 - pos.difficulty)}</span>
                  <span className="text-zinc-600 text-xs ml-auto">
                    {pos.success_count}✓ {pos.fail_count}✗
                  </span>
                </div>
                {pos.notes && <p className="text-zinc-500 text-xs line-clamp-2">{pos.notes}</p>}
                {pos.next_review_at && (
                  <p className="text-zinc-700 text-xs">
                    Tekrar: {new Date(pos.next_review_at).toLocaleDateString('tr-TR')}
                  </p>
                )}
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
              <h2 className="text-white font-semibold">Yeni Oyun Sonu Pozisyonu</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">FEN *</Label>
                    <Textarea value={form.fen} onChange={e => handleFenChange(e.target.value)}
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      rows={3} className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs placeholder:text-zinc-600 resize-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Kategori</Label>
                    <Select value={form.category} onValueChange={v => set('category', v ?? '')}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seç..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Tema / Başlık</Label>
                    <Input value={form.theme} onChange={e => set('theme', e.target.value)}
                      placeholder="Lucena pozisyonu, Philidor..." className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Hedef</Label>
                      <Select value={form.goal} onValueChange={v => set('goal', v ?? 'win')}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="win" className="text-white">Kazan</SelectItem>
                          <SelectItem value="draw" className="text-white">Berabere yap</SelectItem>
                          <SelectItem value="defend" className="text-white">Savun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Zorluk</Label>
                      <Select value={String(form.difficulty)} onValueChange={v => set('difficulty', parseInt(v ?? '3'))}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)} className="text-white">{'★'.repeat(n)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Notlar</Label>
                    <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                      placeholder="Bu pozisyon hakkında notlar..." rows={2}
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
