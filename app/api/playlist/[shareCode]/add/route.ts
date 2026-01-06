import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'

async function getValidToken(shareCode: string) {
  const { data: playlist } = await supabaseAdmin
    .from('shared_playlists')
    .select('spotify_access_token, spotify_refresh_token, id, playlist_id')
    .eq('share_code', shareCode)
    .single()

  if (!playlist) return null

  let token = decrypt(playlist.spotify_access_token)

  const testResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (testResponse.status === 401) {
    const refreshResponse = await fetch(`https://accounts.spotify.com/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: encrypt(playlist.spotify_refresh_token) })
    })

    const refreshData = await refreshResponse.json()
    
    if (refreshData.access_token) {
      token = refreshData.access_token
      
      await supabaseAdmin
        .from('shared_playlists')
        .update({ spotify_access_token: encrypt(token) })
        .eq('id', playlist.id)
    }
  }

  return { token, playlist }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { trackUri } = await request.json()

  if (!trackUri) {
    return NextResponse.json({ error: 'Track URI required' }, { status: 400 })
  }

  const { shareCode } = await params
  const result = await getValidToken(shareCode)

  if (!result) {
    return NextResponse.json({ error: 'Invalid playlist' }, { status: 404 })
  }

  const { token, playlist } = result

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlist.playlist_id}/tracks`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [trackUri] })
    }
  )

  if (response.ok) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to add track' }, { status: 500 })
}