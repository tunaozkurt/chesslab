'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Settings, User, Cpu, Trophy } from 'lucide-react'

interface UserSettings {
  id?: string
  display_name: string | null
  rating: number | null
  preferred_color: string
  stockfish_depth: number
  default_platform: string
}

interface Props {
  settings: UserSettings | null
  userEmail: string
}

export function SettingsContent({ settings, userEmail }: Props) {
  const [form, setForm] = useState<UserSettings>({
    display_name: settings?.display_name ?? '',
    rating: settings?.rating ?? 1500,
    preferred_color: settings?.preferred_color ?? 'both',
    stockfish_depth: settings?.stockfish_depth ?? 20,
    default_platform: settings?.default_platform ?? 'chess.com',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof UserSettings, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Ayarlar kaydedildi')
    } else {
      toast.error('Kaydedilemedi')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-zinc-400" />
          Ayarlar
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Uygulama tercihlerini yönet</p>
      </div>

      {/* Profile */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">
                {(form.display_name || userEmail).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{form.display_name || 'İsimsiz'}</p>
              <p className="text-zinc-500 text-xs">{userEmail}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Görünen Ad</Label>
            <Input
              value={form.display_name ?? ''}
              onChange={e => set('display_name', e.target.value)}
              placeholder="Adın..."
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Tahmini Rating
            </Label>
            <Input
              type="number"
              value={form.rating ?? ''}
              onChange={e => set('rating', parseInt(e.target.value) || null)}
              placeholder="1500"
              min={100}
              max={3500}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
            />
            <p className="text-zinc-600 text-xs">Bu sadece referans içindir, sistemi etkilemez.</p>
          </div>
        </CardContent>
      </Card>

      {/* Oyun Tercihleri */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <span className="text-base">♟</span>
            Oyun Tercihleri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Tercih Edilen Renk</Label>
            <Select value={form.preferred_color} onValueChange={v => set('preferred_color', v ?? 'both')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="both" className="text-white">♔♚ Her ikisi de</SelectItem>
                <SelectItem value="white" className="text-white">♔ Beyaz</SelectItem>
                <SelectItem value="black" className="text-white">♚ Siyah</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Varsayılan Platform</Label>
            <Select value={form.default_platform} onValueChange={v => set('default_platform', v ?? 'chess.com')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="chess.com" className="text-white">Chess.com</SelectItem>
                <SelectItem value="lichess" className="text-white">Lichess</SelectItem>
                <SelectItem value="otb" className="text-white">OTB (Turnuva)</SelectItem>
                <SelectItem value="other" className="text-white">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analiz Ayarları */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Stockfish Analiz Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-zinc-300">Analiz Derinliği</Label>
              <span className="text-amber-400 text-sm font-bold">Derinlik {form.stockfish_depth}</span>
            </div>
            <input
              type="range"
              min={10}
              max={28}
              step={2}
              value={form.stockfish_depth}
              onChange={e => set('stockfish_depth', parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-zinc-600 text-xs">
              <span>10 (Hızlı)</span>
              <span>20 (Önerilen)</span>
              <span>28 (Detaylı)</span>
            </div>
            {form.stockfish_depth > 22 && (
              <p className="text-amber-600 text-xs">
                Yüksek derinlik oyun başına analiz süresini önemli ölçüde artırır.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
      >
        {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
      </Button>
    </div>
  )
}
