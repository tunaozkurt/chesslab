'use client'

import { useState } from 'react'
import { StudyItem } from '@/types'
import type { StudyItemContext } from './types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StudySessionCard } from './StudySessionCard'
import { CalendarCheck, Clock, Flame, Play } from 'lucide-react'

interface Props {
  dueItems: StudyItem[]
  upcomingItems: StudyItem[]
  totalPending: number
  contextMap: Record<string, StudyItemContext>
}

const TYPE_ICON: Record<string, string> = {
  mistake: '⚠️', repertoire: '📖', endgame: '♚', tactic: '⚔️', concept: '💡',
}

const TYPE_LABEL: Record<string, string> = {
  mistake: 'Hata', repertoire: 'Açılış', endgame: 'Oyun Sonu', tactic: 'Taktik', concept: 'Konsept',
}

function daysUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'bugün'
  if (days === 1) return 'yarın'
  return `${days} gün sonra`
}

export function StudyQueueContent({ dueItems, upcomingItems, totalPending, contextMap }: Props) {
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionIndex, setSessionIndex] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  const sessionItems = dueItems.filter(i => !completedIds.has(i.id))
  const completedCount = completedIds.size

  function handleReviewed(itemId: string) {
    setCompletedIds(prev => new Set([...prev, itemId]))
    if (sessionIndex >= sessionItems.length - 2) {
      setSessionIndex(Math.max(0, sessionItems.length - 2))
    }
  }

  if (sessionActive && sessionItems.length > 0) {
    const currentItem = sessionItems[sessionIndex]
    const context = currentItem.reference_id ? contextMap[currentItem.reference_id] : undefined

    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Çalışma Oturumu</h2>
            <p className="text-zinc-400 text-sm">{sessionIndex + 1} / {sessionItems.length}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSessionActive(false)}
            className="border-zinc-700 text-zinc-400"
          >
            Durdur
          </Button>
        </div>

        <div className="space-y-1">
          <Progress
            value={completedCount > 0 ? (completedCount / (completedCount + sessionItems.length)) * 100 : 0}
            className="h-1.5"
          />
          <p className="text-zinc-600 text-xs">{completedCount} tamamlandı · {sessionItems.length} kaldı</p>
        </div>

        <StudySessionCard
          item={currentItem}
          context={context}
          onNext={() => setSessionIndex(i => Math.min(i + 1, sessionItems.length - 1))}
          onPrev={() => setSessionIndex(i => Math.max(0, i - 1))}
          onReviewed={handleReviewed}
          isFirst={sessionIndex === 0}
          isLast={sessionIndex === sessionItems.length - 1}
          onFinish={() => setSessionActive(false)}
        />
      </div>
    )
  }

  if (sessionActive && sessionItems.length === 0) {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-white text-xl font-semibold">Oturum tamamlandı!</h2>
        <p className="text-zinc-400">{completedCount} öğe çalışıldı.</p>
        <Button
          onClick={() => { setSessionActive(false); setCompletedIds(new Set()) }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          Kuyruğa Dön
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-amber-400" />
            Çalışma Planı
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{totalPending} bekleyen öğe</p>
        </div>
        {dueItems.length > 0 && (
          <Button
            onClick={() => { setSessionActive(true); setSessionIndex(0) }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
          >
            <Play className="w-4 h-4" />
            Çalışmaya Başla
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{dueItems.length}</p>
            <p className="text-zinc-500 text-xs mt-0.5">Bugün vadesi gelen</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{upcomingItems.length}</p>
            <p className="text-zinc-500 text-xs mt-0.5">Yaklaşan</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">{totalPending}</p>
            <p className="text-zinc-500 text-xs mt-0.5">Toplam bekleyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Due items */}
      {dueItems.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold">Bugünkü çalışma kuyruğu boş!</p>
            <p className="text-zinc-500 text-sm mt-1">Yeni oyunlar analiz et veya açılış repertuarı ekle.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              Bugün Çalışılacaklar ({dueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {dueItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800 transition-colors">
                <span className="text-zinc-600 text-xs w-5">{idx + 1}.</span>
                <span className="text-base">{TYPE_ICON[item.type] ?? '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-zinc-500 text-xs truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
                    {TYPE_LABEL[item.type]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcomingItems.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Yaklaşan Tekrarlar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {upcomingItems.slice(0, 10).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg">
                <span className="text-base">{TYPE_ICON[item.type] ?? '📋'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-400 text-sm truncate">{item.title}</p>
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0">{daysUntil(item.due_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
