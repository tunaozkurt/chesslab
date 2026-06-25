'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  lichessUsername: string | null
  chesscomUsername: string | null
  lichessLastSync: string | null
  chesscomLastSync: string | null
}

const COOLDOWN_MS = 5 * 60 * 1000 // 5 dakika

function needsSync(lastSync: string | null): boolean {
  if (!lastSync) return true
  return Date.now() - new Date(lastSync).getTime() > COOLDOWN_MS
}

export function AutoSync({ lichessUsername, chesscomUsername, lichessLastSync, chesscomLastSync }: Props) {
  const router = useRouter()

  useEffect(() => {
    const platforms: Array<{ platform: 'lichess' | 'chesscom'; lastSync: string | null }> = []
    if (lichessUsername && needsSync(lichessLastSync)) platforms.push({ platform: 'lichess', lastSync: lichessLastSync })
    if (chesscomUsername && needsSync(chesscomLastSync)) platforms.push({ platform: 'chesscom', lastSync: chesscomLastSync })

    if (platforms.length === 0) return

    async function sync() {
      let totalImported = 0

      for (const { platform } of platforms) {
        try {
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform }),
          })
          if (res.ok) {
            const data = await res.json()
            totalImported += data.imported ?? 0
          }
        } catch {
          // sessizce geç
        }
      }

      if (totalImported > 0) {
        toast.success(`${totalImported} yeni oyun senkronize edildi`)
        router.refresh()
      }
    }

    sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
