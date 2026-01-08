import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'

async function getValidToken(shareCode: string) {
  try {
    const { data: playlist, error: dbError } = await supabaseAdmin
      .from('shared_playlists')
      .select('spotify_access_token, spotify_refresh_token, id')
      .eq('share_code', shareCode)
      .single()

    if (!playlist || dbError) {
      throw new Error('Playlist not found: ' + (dbError?.message || 'unknown'))
    }

    let token = decrypt(playlist.spotify_access_token)
    const refreshToken = decrypt(playlist.spotify_refresh_token)

    // Try the token
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    // If expired, refresh it
    if (testResponse.status === 401) {
      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      })
      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        throw new Error(`Token refresh failed (${refreshResponse.status}): ${errorText}`)
      }

      const refreshData = await refreshResponse.json()
      if (!refreshData.access_token) {
        throw new Error('No access token in refresh response: ' + JSON.stringify(refreshData))
      }

      token = refreshData.access_token

      // Update token in database
      await supabaseAdmin
        .from('shared_playlists')
        .update({ spotify_access_token: encrypt(token) })
        .eq('id', playlist.id)
    }

    return { success: true, token }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    const { shareCode } = await params
    const result = await getValidToken(shareCode)

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Token validation failed', 
        details: result.error 
      }, { status: 401 })
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${result.token}` }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'Spotify search failed',
        status: response.status,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal error',
      message: error.message
    }, { status: 500 })
  }
}