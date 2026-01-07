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
    console.log("Testing current access token")
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    console.log("After testing current access token, status:", testResponse.status)

    console.log("Before 401 check")
    // If expired, refresh it
    if (testResponse.status === 401) {
      //
      console.log("Token is 401, refreshing...")
      console.log('=== TOKEN REFRESH ATTEMPT ===')
      console.log('CLIENT_ID exists:', !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID)
      console.log('CLIENT_SECRET exists:', !!process.env.SPOTIFY_CLIENT_SECRET)
      console.log('CLIENT_ID length:', process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.length)
      console.log('CLIENT_SECRET length:', process.env.SPOTIFY_CLIENT_SECRET?.length)
      console.log('Refresh token length:', refreshToken.length)

      console.log("Fetching new access token from Spotify")
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
      console.log("After fetching new access token from Spotify")

      //
      console.log('Refresh response status:', refreshResponse.status)
      const responseBody = await refreshResponse.text()
      console.log('Refresh response body:', responseBody)

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
    console.log("Calling getValidToken() from POST")
    const result = await getValidToken(shareCode)
    console.log("After calling getValidToken() from POST")

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Token validation failed', 
        details: result.error 
      }, { status: 401 })
    }

    console.log("Fetching Spotify search results")
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      {
        headers: { 'Authorization': `Bearer ${result.token}` }
      }
    )
    console.log("After fetching Spotify search results")

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