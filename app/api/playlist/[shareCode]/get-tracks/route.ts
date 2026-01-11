import { NextResponse } from 'next/server'
import { getValidToken } from '@/lib/token'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  try {
    console.log('API: Received request to get tracks')
    const { playlistId, tracksLength } = await request.json()

    console.log('1')
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist URI required' }, { status: 400 })
    }

    console.log('2')
    const { shareCode } = await params
    console.log('3')
    const result = await getValidToken(shareCode)

    console.log('4')
    if (!result) {
        return NextResponse.json({ error: 'Invalid playlist' }, { status: 404 })
    }

    console.log('API: Fetching tracks for playlist:', playlistId, 'from offset:', tracksLength)
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