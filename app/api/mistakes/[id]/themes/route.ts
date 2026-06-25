import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: mistakeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categoryIds }: { categoryIds: string[] } = await req.json()

  // Verify ownership
  const { data: mistake } = await supabase
    .from('mistakes').select('id').eq('id', mistakeId).eq('user_id', user.id).single()
  if (!mistake) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Replace all themes
  await supabase.from('mistake_themes').delete().eq('mistake_id', mistakeId)
  if (categoryIds.length > 0) {
    await supabase.from('mistake_themes').insert(
      categoryIds.map(cid => ({ mistake_id: mistakeId, category_id: cid, is_auto_tagged: false }))
    )
  }

  // Mark as reviewed
  await supabase.from('mistakes').update({ is_reviewed: true }).eq('id', mistakeId)

  return NextResponse.json({ success: true })
}
