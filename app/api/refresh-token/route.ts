import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { refresh_token } = await request.json()

  if (!refresh_token) {
    return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 })
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    })
  })

  const data = await response.json()

  if (data.access_token) {
    return NextResponse.json({ access_token: data.access_token })
  }

  return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
}