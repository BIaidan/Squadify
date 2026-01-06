'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'


export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)

  type Playlist = {
    id: string
    images: { url: string }[]
    name: string
    owner: { display_name: string }
    tracks: { total: number }
  }

  const [userButtonOpen, setUserButtonOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistSelected, setPlaylistSelected] = useState(false)
  const [shareUrl, setShareUrl] = useState<any>(null)
  const [copied, setCopied] = useState(false)


  useEffect(() => {
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setSession(session)
      
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user && session && playlists.length === 0) {
      fetchSpotifyPlaylists()
    }
  }, [user, session])

  async function signInWithSpotify() {
    const redirectUrl = `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: redirectUrl,
        scopes: 'playlist-modify-public playlist-modify-private playlist-read-private'
      }
    })

    if (error) {
      console.error('Error signing in:', error)
    }
  }

  async function fetchSpotifyPlaylists() {
    if (!session?.provider_token) {
      console.error('No Spotify token available')
      return
    }

    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    })

    const data = await response.json()
      setPlaylists(data.items || [])
    return data
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error && error.message !== 'Auth session missing!') {
        console.error('Error signing out:', error)
      }
      // Clear local state regardless
      setUser(null)
      setSession(null)
      setPlaylists([])
      setPlaylistSelected(false)
      setShareUrl(null)
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  async function createShareLink(playlist: Playlist) {
    if (!playlist || !session) return

    // Fetch full playlist details
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}`,
      {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`
        }
      }
    )
    const fullPlaylist = await playlistResponse.json()
    const playlistImage = fullPlaylist.images?.[0]?.url || null

    // Call server-side API
    const response = await fetch('/api/create-share-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playlist_id: playlist.id,
        playlist_name: playlist.name,
        playlist_image: playlistImage,
        user_id: user.id,
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token
      })
    })

    const data = await response.json()

    if (data.error) {
      console.error('Error creating share link:', data.error)
      return
    }

    setShareUrl(data.share_url)
  }

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for mobile/older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy. Link: ' + text)
    }
  }

  return (
    <div>
      {user ? (
      // SELECT PLAYLIST VIEW
      <div>
        <div className="logged-in-header">
          <img src="/logo_text.png" alt="Squadify Logo" className="logo"/>
          <div className="user-button">
            <button 
              className="user-button-trigger" 
              onClick={() => setUserButtonOpen(!userButtonOpen)}
            >
              <img src={user.user_metadata?.avatar_url} alt="User Avatar" className="avatar"/>
              <span className="user-tooltip">{user.user_metadata?.name || user.email}</span>
            </button>
            <div className={`user-button-menu ${userButtonOpen ? 'open' : 'closed'}`}>
              <button onClick={() => { signOut(); setUserButtonOpen(false); }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
        <div className="playlists-section">
          <h2 className="sub-header">Select a playlist to share:</h2>
          <div className="playlists-fade-container">
            <OverlayScrollbarsComponent 
              options={{
                scrollbars: {
                  theme: 'os-theme-light',
                  autoHideDelay: 800
                },
                overflow: { x: 'hidden', y: 'scroll' },
                paddingAbsolute: true
              }}
              className="playlists-scrollbar"
            >
              <div className="playlists-scroll">
                {playlists.map(playlist => (
                  <div key={playlist.id} className="playlist-card">
                    <img src={playlist.images?.[0]?.url} alt={playlist.name} className="playlist-cover"/>
                    <div className="playlist-info">
                      <h3 className="playlist-name">{playlist.name}</h3>
                      <p>{playlist.owner?.display_name}</p>
                      <p>{playlist.tracks.total} tracks</p>
                    </div>
                    <button onClick={() => {setShareUrl(null); setCopied(false); setPlaylistSelected(true); createShareLink(playlist)}} className="playlist-button">
                      Share
                    </button>
                  </div>
                ))}
              </div>
            </OverlayScrollbarsComponent>
          </div>
        </div>
        <div className={`share-link-section ${playlistSelected ? 'open' : 'closed'}`}>
          <h3 className="share-link-header">Invite collaborators with this link:</h3>
          <div className="share-link-field" >
            <p className="share-url">{shareUrl ? (copied ? "Copied!" : shareUrl) : "Generating share link..."}</p>
            <button onClick={() => {copyToClipboard(shareUrl); setCopied(true)}} className="copy-button">
              Copy
            </button>
          </div>
        </div>
      </div>
      
      ) : (
        // WELCOME VIEW
        <div className="welcome">
          <img src="/logo_text.png" alt="Squadify Logo" className="welcome-logo"/>
          <button 
            onClick={signInWithSpotify} 
            className="spotify-button"
          >
            <img src="/Spotify_Primary_Logo_RGB_White.png" alt="Spotify Logo" className="spotify-logo"/>
            Sign in with Spotify
          </button>
        </div>
      )}
    </div>
  )
}