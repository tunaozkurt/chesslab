export interface SM2Result {
  interval: number
  ease: number
  nextReviewAt: Date
}

export function sm2(
  quality: number,         // 0-5
  prevInterval: number,    // gün cinsinden
  prevEase: number         // default 2.5
): SM2Result {
  const clampedQuality = Math.max(0, Math.min(5, quality))
  let newEase = prevEase + (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02))
  newEase = Math.max(1.3, newEase)

  let newInterval: number
  if (clampedQuality < 3) {
    newInterval = 1
  } else if (prevInterval === 1) {
    newInterval = 3
  } else if (prevInterval === 3) {
    newInterval = 7
  } else {
    newInterval = Math.round(prevInterval * newEase)
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)

  return { interval: newInterval, ease: newEase, nextReviewAt }
}

export function calculatePriorityScore(params: {
  dueAt: string
  severity?: 'inaccuracy' | 'mistake' | 'blunder' | null
  failCount?: number
  successCount?: number
  isRepertoire?: boolean
}): number {
  const { dueAt, severity, failCount = 0, successCount = 0, isRepertoire = false } = params

  const overdueDays = Math.max(
    0,
    (new Date().getTime() - new Date(dueAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  const severityScore = severity === 'blunder' ? 30 : severity === 'mistake' ? 20 : 10
  const failRatio = failCount / Math.max(successCount + failCount, 1)
  const repertoireBonus = isRepertoire ? 1.5 : 1.0

  return (overdueDays * 10 + severityScore + failRatio * 15) * repertoireBonus
}
