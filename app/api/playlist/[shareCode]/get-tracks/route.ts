import { NextResponse } from 'next/server'
import { getValidToken } from '@/lib/token'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    const { playlistId, tracksLength } = await request.json()

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist URI required' }, { status: 400 })
    }

    const { shareCode } = await params
    const result = await getValidToken(shareCode)

    if (!result) {
        return NextResponse.json({ error: 'Invalid playlist' }, { status: 404 })
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${tracksLength}&limit=50`,
      {
        headers: { 'Authorization': `Bearer ${result.token}` }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'Failed to fetch tracks',
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