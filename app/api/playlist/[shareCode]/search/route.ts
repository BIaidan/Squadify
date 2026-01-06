import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'

async function getValidToken(shareCode: string) {
  const { data: playlist } = await supabaseAdmin
    .from('shared_playlists')
    .select('spotify_access_token, spotify_refresh_token, id')
    .eq('share_code', shareCode)
    .single()

  if (!playlist) return null

  let token = decrypt(playlist.spotify_access_token)
  const refreshToken = decrypt(playlist.spotify_refresh_token) // Decrypt here

  // Try the token
  const testResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  // If expired, refresh it
  if (testResponse.status === 401) {
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // Changed from application/json
        'Authorization': 'Basic ' + Buffer.from(`${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({ // Changed from JSON.stringify
        grant_type: 'refresh_token',
        refresh_token: refreshToken // Use decrypted token, not encrypted
      })
    })

    const refreshData = await refreshResponse.json()
    
    if (refreshData.access_token) {
      token = refreshData.access_token
      
      // Update token in database
      await supabaseAdmin
        .from('shared_playlists')
        .update({ spotify_access_token: encrypt(token) })
        .eq('id', playlist.id)
    }
  }

  return token
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { query } = await request.json()

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const { shareCode } = await params
  const token = await getValidToken(shareCode)

  if (!token) {
    return NextResponse.json({ error: 'Invalid playlist' }, { status: 404 })
  }

  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )

  const data = await response.json()
  return NextResponse.json(data)
}