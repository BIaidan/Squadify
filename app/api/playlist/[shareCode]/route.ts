import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { shareCode } = await params

  const { data: playlist, error } = await supabaseAdmin
    .from('shared_playlists')
    .select('id, playlist_id, playlist_name, playlist_image')
    .eq('share_code', shareCode)
    .single()

  if (error || !playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: playlist.id,
    playlist_id: playlist.playlist_id,
    playlist_name: playlist.playlist_name,
    playlist_image: playlist.playlist_image
  })
}