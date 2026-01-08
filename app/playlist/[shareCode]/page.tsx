'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'

export default function SharedPlaylist() {
  const params = useParams()
  const shareCode = params.shareCode
  
  const [playlistData, setPlaylistData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addedTracks, setAddedTracks] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadPlaylist() {
        const response = await fetch(`/api/playlist/${shareCode}`)
        const data = await response.json()

        if (data.error) {
        console.error('Playlist not found:', data.error)
        return
        }

        setPlaylistData(data)
    }

    loadPlaylist()
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
    setSearchResults(data.tracks?.items || [])
    setSearching(false)
  }

  async function addTrackToPlaylist(trackUri: string, trackId: string) {
    const response = await fetch(`/api/playlist/${shareCode}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUri })
    })

    const data = await response.json()

    if (data.success) {
        setAddedTracks(prev => new Set(prev).add(trackId))
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
            <div className="playlist-embed">
                <iframe 
                    src={`https://open.spotify.com/embed/playlist/${playlistData.playlist_id}`}
                    allow="encrypted-media"
                ></iframe>
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
                                {searchResults.map((track: any) => (
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
                                            className={addedTracks.has(track.id) ? "track-button-added" : "track-button-add"}
                                            disabled={addedTracks.has(track.id)}
                                            onClick={() => addTrackToPlaylist(track.uri, track.id)}
                                        >
                                            {addedTracks.has(track.id) ? "Added" : "Add"}
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