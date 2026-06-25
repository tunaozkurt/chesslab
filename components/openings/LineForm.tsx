'use client'

import { useState } from 'react'
import { RepertoireLine } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface Props {
  line: RepertoireLine | null
  defaultColor: 'white' | 'black'
  onSave: (line: RepertoireLine) => void
  onClose: () => void
}

export function LineForm({ line, defaultColor, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    color: line?.color ?? defaultColor,
    name: line?.name ?? '',
    eco_code: line?.eco_code ?? '',
    moves: line?.moves ?? '',
    main_idea: line?.main_idea ?? '',
    typical_plan: line?.typical_plan ?? '',
    pawn_structure: line?.pawn_structure ?? '',
    dangerous_ideas: line?.dangerous_ideas ?? '',
    notes: line?.notes ?? '',
    confidence_score: line?.confidence_score ?? 50,
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('İsim gerekli'); return }
    setSaving(true)

    const url = line ? `/api/repertoire/${line.id}` : '/api/repertoire'
    const method = line ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      const data = await res.json()
      toast.success(line ? 'Satır güncellendi' : 'Satır eklendi')
      onSave(data)
    } else {
      const err = await res.json()
      toast.error('Hata: ' + err.error)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-white font-semibold">{line ? 'Satırı Düzenle' : 'Yeni Repertuar Satırı'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Renk</Label>
              <Select value={form.color} onValueChange={v => set('color', v ?? 'white')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="white" className="text-white">♔ Beyaz</SelectItem>
                  <SelectItem value="black" className="text-white">♚ Siyah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">ECO Kodu</Label>
              <Input value={form.eco_code} onChange={e => set('eco_code', e.target.value)}
                placeholder="B12, C65..." className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Satır Adı *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Caro-Kann Advance, İtalyan Oyunu..." required
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500" />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Hamle Dizisi</Label>
            <Input value={form.moves} onChange={e => set('moves', e.target.value)}
              placeholder="1.e4 c6 2.d4 d5 3.e5..."
              className="bg-zinc-800 border-zinc-700 text-white font-mono text-sm placeholder:text-zinc-500 focus:border-amber-500" />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Ana Fikir</Label>
            <Textarea value={form.main_idea} onChange={e => set('main_idea', e.target.value)}
              placeholder="Bu açılışın temel amacı ve stratejisi..."
              rows={2} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:border-amber-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Tipik Plan</Label>
              <Textarea value={form.typical_plan} onChange={e => set('typical_plan', e.target.value)}
                placeholder="f5-f4 atağı, at c4'e..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:border-amber-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Piyon Yapısı</Label>
              <Textarea value={form.pawn_structure} onChange={e => set('pawn_structure', e.target.value)}
                placeholder="Kapalı merkez, izole..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:border-amber-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300 text-red-300">Tehlikeli Fikirler</Label>
              <Textarea value={form.dangerous_ideas} onChange={e => set('dangerous_ideas', e.target.value)}
                placeholder="Dikkat edilmesi gereken..." rows={2}
                className="bg-zinc-800 border-red-500/20 text-white placeholder:text-zinc-500 resize-none focus:border-red-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Notlar</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Serbest notlar..." rows={2}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none focus:border-amber-500" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-zinc-300">Güven Skoru</Label>
              <span className="text-amber-400 text-sm font-bold">{form.confidence_score}/100</span>
            </div>
            <input type="range" min={0} max={100} value={form.confidence_score}
              onChange={e => set('confidence_score', parseInt(e.target.value))}
              className="w-full accent-amber-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-400">İptal</Button>
            <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              {saving ? 'Kaydediliyor...' : line ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
