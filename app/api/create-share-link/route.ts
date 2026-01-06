import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/encryption'

function generateShareCode() {
  return Math.random().toString(36).substring(2, 10)
}

export async function POST(request: Request) {
  const { playlist_id, playlist_name, playlist_image, user_id, access_token, refresh_token } = await request.json()

  const shareCode = generateShareCode()

  const { data, error } = await supabaseAdmin
    .from('shared_playlists')
    .insert({
      user_id,
      playlist_id,
      playlist_name,
      playlist_image,
      share_code: shareCode,
      spotify_access_token: encrypt(access_token),
      spotify_refresh_token: encrypt(refresh_token)
    })
    .select('id, share_code')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    share_code: data.share_code,
    share_url: `${request.headers.get('origin')}/playlist/${data.share_code}`
  })
}