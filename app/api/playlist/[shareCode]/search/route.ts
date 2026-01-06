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

    console.log('Playlist lookup:', playlist ? 'found' : 'not found', dbError)

    if (!playlist) return null

    let token = decrypt(playlist.spotify_access_token)
    const refreshToken = decrypt(playlist.spotify_refresh_token)

    console.log('Testing token validity')

    // Try the token
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    console.log('Token test status:', testResponse.status)

    // If expired, refresh it
    if (testResponse.status === 401) {
      console.log('Refreshing token...')
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

      console.log('Refresh response status:', refreshResponse.status)
      const refreshData = await refreshResponse.json()
      console.log('Refresh data:', refreshData)
      
      if (refreshData.access_token) {
        token = refreshData.access_token
        
        // Update token in database
        await supabaseAdmin
          .from('shared_playlists')
          .update({ spotify_access_token: encrypt(token) })
          .eq('id', playlist.id)
        
        console.log('Token refreshed and updated')
      }
    }

    return token
  } catch (error) {
    console.error('getValidToken error:', error)
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { query } = await request.json()
    console.log('Search query:', query)

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    const { shareCode } = await params
    console.log('Share code:', shareCode)
    
    const token = await getValidToken(shareCode)

    if (!token) {
      console.log('No valid token found')
      return NextResponse.json({ error: 'Invalid playlist' }, { status: 404 })
    }

    console.log('Making Spotify search request')
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )

    console.log('Spotify search status:', response.status)
    const data = await response.json()
    console.log('Search results:', data.tracks?.items?.length || 0, 'tracks')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}