'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'

export default function SharedPlaylist() {
  const params = useParams()
  const shareCode = params.shareCode

  type Track = {
    album: {
        name: string
        images: { url: string }[]
    }
    artists: { name: string }[]
    id: string
    name: string
    uri: string
  }
  
  const [playlistData, setPlaylistData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [tracks, setTracks] = useState<Track[]>([])

  useEffect(() => {
    async function loadPlaylist(tracksLength: number) {
        let response = await fetch(`/api/playlist/${shareCode}`)
        let data = await response.json()

        if (data.error) {
            console.error('Playlist not found:', data.error)
            return
        }

        setPlaylistData(data)

        console.log('Playlist data loaded:', data)
        console.log('Loading tracks for playlist:', data.playlist_id)
        response = await fetch(`/api/playlist/${shareCode}/get-tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistId: data.playlist_id, tracksLength })
        })

        if (data.error) {
            console.error('Failed to fetch tracks: ', data.error)
            return
        }

        data = await response.json()
        const loadedTracks = data.items.map((item: any) => item.track)
        setTracks(tracks.concat(loadedTracks))
        console.log('Fetched playlist tracks:', data)
        console.log('Tracks state updated:', tracks)
    }

    loadPlaylist(tracks?.length)
  }, [shareCode])

  

  async function searchSpotify() {
    if (!searchQuery.trim()) return

    setSearching(true)

    const response = await fetch(`/api/playlist/${shareCode}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
    })

    const data = await response.json()
    console.log('Search data:', data)
    setSearchResults(data.tracks?.items)
    setSearching(false)
    console.log('Search results:', searchResults)
  }

  async function addTrackToPlaylist(track: Track) {
    if (!track) {
        console.log('No track provided')
        return
    }

    const trackUri = track?.uri

    const response = await fetch(`/api/playlist/${shareCode}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUri })
    })

    const data = await response.json()

    
    if (data.success) {
        setTracks(tracks.concat([track]))
        console.log('Song added to playlist!')
    } else {
        console.log('Failed to add song')
    }
  }

  if (!playlistData) return <div>Playlist not found</div>

  return (
    <div>
        <div className="collaborate-header">
            <img src="/logo_text.png" alt="Squadify Logo" className="logo"/>
        </div>
        <h2 className="sub-header">You've been invited to collaborate on a playlist!</h2>

        <div className="collaborate-section">
            {/*
            <div className="playlist-embed">
                <iframe 
                    src={`https://open.spotify.com/embed/playlist/${playlistData.playlist_id}`}
                    allow="encrypted-media"
                ></iframe>
            </div>
            */}
            <div className="collab-playlist-section">
                <div className="collab-playlist-info">
                    <a href={"https://open.spotify.com/playlist/" + playlistData.playlist_id}>
                        <img 
                            className="collab-playlist-cover"
                            src={playlistData.playlist_image}>
                        </img>
                    </a>
                    <a 
                        className="collab-playlist-name" 
                        href={"https://open.spotify.com/playlist/" + playlistData.playlist_id}
                    >
                        {playlistData.playlist_name}
                    </a>
                </div>

                <div className="collab-playlist-tracks">
                    <div className="collab-playlist-tracks-fade-container">
                        <OverlayScrollbarsComponent 
                            options={{
                                scrollbars: {
                                theme: 'os-theme-light',
                                autoHideDelay: 800
                                },
                                overflow: { x: 'hidden', y: 'scroll' },
                                paddingAbsolute: true
                            }}
                            className="tracks-scrollbar"
                        >
                            <div className="collab-playlist-tracks-scroll">
                                {tracks.map((track: Track) => (
                                    <div key={track.id} className="playlist-track-card">
                                        <img 
                                            className="track-cover"
                                            src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                            alt={track.name}
                                        />
                                        <div className="track-info">
                                            <h3 className="track-name">{track.name}</h3>
                                            <p>
                                                {track.artists.map((artist: any) => artist.name).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                
                            </div>
                        </OverlayScrollbarsComponent>
                    </div>
                </div>
            </div>

                
            <div className="search-section">
                <h3 className="search-header">Search and Add Tracks</h3>
                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchSpotify()}
                        placeholder="Search for tracks..."
                    />
                    <button 
                        className="search-button"
                        onClick={searchSpotify}
                        disabled={searching}
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>

                <div className="tracks-section">
                    <div className="tracks-fade-container">
                        <OverlayScrollbarsComponent 
                            options={{
                                scrollbars: {
                                theme: 'os-theme-light',
                                autoHideDelay: 800
                                },
                                overflow: { x: 'hidden', y: 'scroll' },
                                paddingAbsolute: true
                            }}
                            className="tracks-scrollbar"
                        >
                            <div className="tracks-scroll">
                                {searchResults.map((track: Track) => (
                                    <div key={track.id} className="track-card">
                                        <img 
                                            className="track-cover"
                                            src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                            alt={track.name}
                                        />
                                        <div className="track-info">
                                            <h3 className="track-name">{track.name}</h3>
                                            <p>
                                                {track.artists.map((artist: any) => artist.name).join(', ')}
                                            </p>
                                        </div>
                                        <button 
                                            className="track-button-add"
                                            onClick={() => addTrackToPlaylist(track)}
                                        >
                                            +
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </OverlayScrollbarsComponent>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
  )
}