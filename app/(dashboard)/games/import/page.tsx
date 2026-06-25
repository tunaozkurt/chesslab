'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, CheckCircle } from 'lucide-react'

type Platform = 'lichess' | 'chesscom'

export default function ImportPage() {
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform>('lichess')
  const [username, setUsername] = useState('')
  const [max, setMax] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) {
      toast.error('Kullanıcı adı gerekli')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: username.trim(), max: parseInt(max) }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Bir hata oluştu')
        return
      }

      setResult(data)

      if (data.imported > 0) {
        toast.success(`${data.imported} oyun eklendi!`)
      } else {
        toast.info('Yeni oyun bulunamadı, hepsi zaten mevcut.')
      }
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Oyun İçe Aktar</h1>
        <p className="text-zinc-400 text-sm mt-1">Lichess veya Chess.com hesabından oyunlarını çek.</p>
      </div>

      <form onSubmit={handleImport} className="space-y-6">
        {/* Platform seçimi */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlatform('lichess')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  platform === 'lichess'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                Lichess
              </button>
              <button
                type="button"
                onClick={() => setPlatform('chesscom')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  platform === 'chesscom'
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                Chess.com
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Kullanıcı adı + adet */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">
                {platform === 'lichess' ? 'Lichess' : 'Chess.com'} kullanıcı adı
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === 'lichess' ? 'örn: magnus' : 'örn: MagnusCarlsen'}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Kaç oyun çekilsin?</Label>
              <Select value={max} onValueChange={(v) => v && setMax(v)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="10" className="text-white">Son 10 oyun</SelectItem>
                  <SelectItem value="20" className="text-white">Son 20 oyun</SelectItem>
                  <SelectItem value="50" className="text-white">Son 50 oyun</SelectItem>
                  <SelectItem value="100" className="text-white">Son 100 oyun</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sonuç */}
        {result && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="text-emerald-400 font-medium">İçe aktarma tamamlandı</p>
              <p className="text-zinc-400">
                <span className="text-white font-medium">{result.imported}</span> oyun eklendi
                {result.skipped > 0 && (
                  <>, <span className="text-zinc-500">{result.skipped} zaten mevcut veya atlandı</span></>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || !username.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 px-6"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Çekiliyor...' : 'Oyunları Çek'}
          </Button>
          {result && result.imported > 0 && (
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => router.push('/games')}
            >
              Oyunlarıma Git
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
