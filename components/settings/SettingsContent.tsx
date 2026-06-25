'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings, User, Cpu, Trophy, Link2, RefreshCw } from 'lucide-react'

interface UserSettings {
  id?: string
  display_name: string | null
  rating: number | null
  preferred_color: string
  stockfish_depth: number
  default_platform: string
  lichess_username: string | null
  chesscom_username: string | null
  lichess_last_sync: string | null
  chesscom_last_sync: string | null
}

interface Props {
  settings: UserSettings | null
  userEmail: string
}

function syncAgo(ts: string | null): string {
  if (!ts) return 'Hiç senkronize edilmedi'
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Az önce'
  if (min < 60) return `${min} dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa önce`
  return `${Math.floor(hr / 24)} gün önce`
}

export function SettingsContent({ settings, userEmail }: Props) {
  const [form, setForm] = useState<UserSettings>({
    display_name: settings?.display_name ?? '',
    rating: settings?.rating ?? 1500,
    preferred_color: settings?.preferred_color ?? 'both',
    stockfish_depth: settings?.stockfish_depth ?? 20,
    default_platform: settings?.default_platform ?? 'chess.com',
    lichess_username: settings?.lichess_username ?? '',
    chesscom_username: settings?.chesscom_username ?? '',
    lichess_last_sync: settings?.lichess_last_sync ?? null,
    chesscom_last_sync: settings?.chesscom_last_sync ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<'lichess' | 'chesscom' | null>(null)

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

  async function handleSync(platform: 'lichess' | 'chesscom') {
    const username = platform === 'lichess' ? form.lichess_username : form.chesscom_username
    if (!username?.trim()) {
      toast.error('Önce kullanıcı adı gir ve kaydet')
      return
    }

    // Önce ayarları kaydet (kullanıcı adı DB'de olmalı)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSyncing(platform)
    const label = platform === 'lichess' ? 'Lichess' : 'Chess.com'
    toast.loading(`${label} oyunları çekiliyor...`, { id: 'sync' })

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Sync başarısız', { id: 'sync' })
        return
      }

      const now = new Date().toISOString()
      setForm(f => ({
        ...f,
        [`${platform}_last_sync`]: now,
      }))

      if (data.imported > 0) {
        toast.success(`${data.imported} oyun eklendi!`, { id: 'sync' })
      } else {
        toast.success('Zaten güncel, yeni oyun yok.', { id: 'sync' })
      }
    } catch {
      toast.error('Bağlantı hatası', { id: 'sync' })
    } finally {
      setSyncing(null)
    }
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

      {/* Bağlı Hesaplar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-400" />
            Bağlı Hesaplar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Lichess */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Lichess Kullanıcı Adı</Label>
              {form.lichess_username && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Bağlı
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.lichess_username ?? ''}
                onChange={e => set('lichess_username', e.target.value)}
                placeholder="örn: magnus"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={syncing === 'lichess' || !form.lichess_username?.trim()}
                onClick={() => handleSync('lichess')}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0"
                title="Şimdi senkronize et"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === 'lichess' ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {form.lichess_username && (
              <p className="text-zinc-600 text-xs">Son sync: {syncAgo(form.lichess_last_sync)}</p>
            )}
          </div>

          {/* Chess.com */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Chess.com Kullanıcı Adı</Label>
              {form.chesscom_username && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Bağlı
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.chesscom_username ?? ''}
                onChange={e => set('chesscom_username', e.target.value)}
                placeholder="örn: MagnusCarlsen"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={syncing === 'chesscom' || !form.chesscom_username?.trim()}
                onClick={() => handleSync('chesscom')}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0"
                title="Şimdi senkronize et"
              >
                <RefreshCw className={`w-4 h-4 ${syncing === 'chesscom' ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {form.chesscom_username && (
              <p className="text-zinc-600 text-xs">Son sync: {syncAgo(form.chesscom_last_sync)}</p>
            )}
          </div>

          <p className="text-zinc-600 text-xs">
            Kullanıcı adlarını kaydettikten sonra Oyunlarım sayfası her açıldığında otomatik senkronize edilir.
          </p>
        </CardContent>
      </Card>

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
            <Select value={form.preferred_color} onValueChange={v => v && set('preferred_color', v)}>
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
            <Select value={form.default_platform} onValueChange={v => v && set('default_platform', v)}>
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
