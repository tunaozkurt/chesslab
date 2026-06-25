'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parsePGN, extractMoves } from '@/lib/chess/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle } from 'lucide-react'

const PLATFORMS = ['chess.com', 'lichess', 'OTB (Masa başı)', 'Chess24', 'Diğer']

export default function UploadPage() {
  const router = useRouter()
  const [pgn, setPgn] = useState('')
  const [platform, setPlatform] = useState('chess.com')
  const [opponent, setOpponent] = useState('')
  const [userColor, setUserColor] = useState<'white' | 'black' | ''>('')
  const [result, setResult] = useState<'win' | 'loss' | 'draw' | ''>('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ReturnType<typeof parsePGN> | null>(null)
  const [previewError, setPreviewError] = useState('')

  function handlePgnChange(value: string) {
    setPgn(value)
    if (!value.trim()) {
      setPreview(null)
      setPreviewError('')
      return
    }
    const parsed = parsePGN(value)
    if (!parsed) {
      setPreviewError('Geçersiz PGN formatı. Lütfen kontrol et.')
      setPreview(null)
    } else {
      setPreviewError('')
      setPreview(parsed)
      if (parsed.opponent && !opponent) setOpponent(parsed.opponent)
      if (parsed.user_color && !userColor) setUserColor(parsed.user_color)
      if (parsed.result && !result) setResult(parsed.result)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pgn.trim()) {
      toast.error('PGN metni gerekli')
      return
    }

    const parsed = parsePGN(pgn)
    if (!parsed) {
      toast.error('Geçersiz PGN')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const gameData = {
      user_id: user.id,
      pgn,
      platform,
      opponent: opponent || parsed.opponent || null,
      played_at: parsed.played_at,
      time_control: parsed.time_control,
      user_color: (userColor || parsed.user_color) as 'white' | 'black' | null,
      result: (result || parsed.result) as 'win' | 'loss' | 'draw' | null,
      opening_name: parsed.opening_name,
      eco_code: parsed.eco_code,
      total_moves: parsed.total_moves,
      analysis_status: 'pending',
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single()

    if (gameError || !game) {
      toast.error('Oyun kaydedilemedi: ' + gameError?.message)
      setLoading(false)
      return
    }

    // Hamleleri kaydet
    const moves = extractMoves(pgn).map(m => ({ ...m, game_id: game.id }))
    if (moves.length > 0) {
      const { error: movesError } = await supabase.from('moves').insert(moves)
      if (movesError) {
        toast.error('Hamleler kaydedilemedi')
        setLoading(false)
        return
      }
    }

    toast.success('Oyun başarıyla yüklendi! Analiz sıraya alındı.')
    router.push(`/games/${game.id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">PGN Yükle</h1>
        <p className="text-zinc-400 text-sm mt-1">Oyununu yapıştır, sistem analiz için sıraya alır.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PGN Input */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              PGN Metni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={pgn}
              onChange={(e) => handlePgnChange(e.target.value)}
              placeholder={`[Event "Rated Blitz game"]\n[Site "chess.com"]\n[Date "2024.01.01"]\n[White "..."]\n[Black "..."]\n[Result "1-0"]\n\n1.e4 e5 2.Nf3 Nc6 ...`}
              rows={10}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 font-mono text-xs resize-none focus:border-amber-500"
            />
            {previewError && <p className="text-red-400 text-sm">{previewError}</p>}
            {preview && (
              <div className="bg-zinc-800/50 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="text-emerald-400 font-medium">PGN geçerli</p>
                  <p className="text-zinc-400">
                    {preview.total_moves} hamle
                    {preview.opening_name && ` · ${preview.opening_name}`}
                    {preview.eco_code && ` (${preview.eco_code})`}
                  </p>
                  {preview.played_at && (
                    <p className="text-zinc-500 text-xs">
                      {new Date(preview.played_at).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Game Details */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Oyun Detayları</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Rakip</Label>
              <Input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Rakip adı"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v ?? '')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p} className="text-white hover:bg-zinc-700">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Benim Rengim</Label>
              <Select value={userColor} onValueChange={(v) => setUserColor(v as 'white' | 'black')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-amber-500">
                  <SelectValue placeholder="Seç..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="white" className="text-white">♔ Beyaz</SelectItem>
                  <SelectItem value="black" className="text-white">♚ Siyah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Sonuç</Label>
              <Select value={result} onValueChange={(v) => setResult(v as 'win' | 'loss' | 'draw')}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white focus:border-amber-500">
                  <SelectValue placeholder="Seç..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="win" className="text-white">Kazandım</SelectItem>
                  <SelectItem value="loss" className="text-white">Kaybettim</SelectItem>
                  <SelectItem value="draw" className="text-white">Berabere</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={loading || !pgn.trim() || !!previewError}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 px-8"
        >
          <Upload className="w-4 h-4" />
          {loading ? 'Yükleniyor...' : 'Oyunu Kaydet ve Analiz Sırala'}
        </Button>
      </form>
    </div>
  )
}
