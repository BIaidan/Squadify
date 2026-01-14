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
  const [addedTracks, setAddedTracks] = useState<Track[]>([])
  const [numTracks, setNumTracks] = useState(0)
  const [loadingTracks, setLoadingTracks] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [trackToDelete, setTrackToDelete] = useState<Track>()

  useEffect(() => {
    async function loadPlaylist() {
        const response = await fetch(`/api/playlist/${shareCode}`)
        const data = await response.json()

        if (data.error) {
            console.error('Playlist not found:', data.error)
            return
        }

        setPlaylistData(data)
        await loadTracks(data.playlist_id, tracks.length)
    }

    loadPlaylist()
  }, [shareCode])

  async function loadTracks(playlistId: string, tracksLength: number) {
    if (loadingTracks) return
    if (tracksLength >= numTracks && numTracks !== 0) return
    setLoadingTracks(true)

    const response = await fetch(`/api/playlist/${shareCode}/get-tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlistId, tracksLength })
    })

    const data = await response.json()

    if (data.error) {
        console.error('Failed to fetch tracks: ', data.error)
        return
    }

    const loadedTracks = data.items.map((item: any) => item.track)
    setTracks(tracks.concat(loadedTracks))
    setNumTracks(data.total)
    setLoadingTracks(false)
  }

  async function search() {
    if (!searchQuery.trim()) return

    setSearching(true)

    const response = await fetch(`/api/playlist/${shareCode}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
    })

    const data = await response.json()
    setSearchResults(data.tracks?.items)
    setSearching(false)
  }

  async function addTrack(track: Track) {
    if (!track) {
        console.log('No track provided')
        return
    }

    setAddedTracks(addedTracks.concat([track]))
    setTracks(tracks.concat([track]))
    setNumTracks(numTracks + 1)

    const trackUri = track?.uri

    const response = await fetch(`/api/playlist/${shareCode}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUri })
    })

    const data = await response.json()
    
    if (!data.success) {
        console.log('Failed to add track')
    }
  }

  async function deleteTrack(track: Track) {
    if (!track) {
        console.log('No track provided')
        return
    }

    setAddedTracks(addedTracks.filter(t => t.id !== track.id))
    setTracks(tracks.filter(t => t.id !== track.id))
    setNumTracks(numTracks - 1)

    const trackUri = track?.uri

    const response = await fetch(`/api/playlist/${shareCode}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUri })
    })

    const data = await response.json()

    
    if (!data.success) {
        console.log('Failed to delete track')
    }
  }

  function handleScroll(instance: any) {
    const scrollInfo = instance.elements()
    const { scrollOffsetElement } = scrollInfo
    const { scrollTop, scrollHeight, clientHeight } = scrollOffsetElement

    // Check if scrolled to bottom (with small threshold)
    if (scrollHeight - scrollTop - clientHeight < 50) {
        loadTracks(playlistData.playlist_id, numTracks)
    }
  }

  if (!playlistData) return <div>Playlist not found</div>

  return (
    <div>
        <div className="collab-header">
            <a
                href="/"
            >
                <img src="/logo_text.png" alt="Squadify Logo" className="logo"/>
            </a>
            
        </div>
        <div className="collab-section">
            <div className="sub-header-container">
                {addedTracks.length == 0 ? (
                    <h2 className="sub-header">You've been invited to collaborate on a playlist!</h2>
                ) : (
                    <div className="added-tracks-section">
                        <h2 className="added-tracks-header">Added Tracks</h2>
                        <div className="added-tracks-fade-container">
                            <OverlayScrollbarsComponent 
                                    options={{
                                        scrollbars: {
                                        theme: 'os-theme-light',
                                        autoHideDelay: 800
                                        },
                                        overflow: { x: 'hidden', y: 'scroll' },
                                        paddingAbsolute: true
                                    }}
                                    className="added-tracks-scrollbar"
                            >
                                <div className="added-tracks-scroll">
                                    {addedTracks.map((track: Track, index: number) => (
                                        <div key={track.id} className="added-track-card">
                                            <a
                                                href={`https://open.spotify.com/track/${track.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <img 
                                                    className="added-track-cover"
                                                    src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                                    alt={track.name}
                                                />
                                            </a>
                                            
                                            <a 
                                                className="added-track-name underline-on-hover"
                                                href={`https://open.spotify.com/track/${track.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {track.name}
                                            </a>
                                            <span className="added-track-artists">
                                                &nbsp;•{" "}
                                                {track.artists.map((artist: any, index: number) => (
                                                    <span key={artist.id ?? artist.name}>
                                                    <a
                                                        className="underline-on-hover"
                                                        href={`https://open.spotify.com/artist/${artist.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {artist.name}
                                                    </a>
                                                    {index < track.artists.length - 1 && ", "}
                                                    </span>
                                                ))}
                                            </span>
                                            <button 
                                                className="collab-pl-track-button-delete"
                                                onClick={() => {
                                                    setTrackToDelete(track)
                                                    setShowDeleteModal(true)
                                                }}
                                            >
                                                <img src="/minus.png" alt="Delete" className="collab-pl-track-button-delete-icon"></img>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </OverlayScrollbarsComponent>
                        </div>
                    </div>
                )}
            </div>
        
            <div className="collab-pl-section">
                <a 
                    className="collab-pl-cover-link" 
                    href={`https://open.spotify.com/playlist/${playlistData.playlist_id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    <img 
                        className="collab-pl-cover"
                        src={playlistData.playlist_image}>
                    </img>
                </a>

                <div className="collab-pl-tracks">
                    <a 
                        className="collab-pl-name underline-on-hover" 
                        href={"https://open.spotify.com/playlist/" + playlistData.playlist_id} target="_blank" rel="noopener noreferrer"
                    >
                        {playlistData.playlist_name}
                    </a>
                    <div className="collab-pl-tracks-fade-container">
                        <OverlayScrollbarsComponent 
                            options={{
                                scrollbars: {
                                theme: 'os-theme-light',
                                autoHideDelay: 800
                                },
                                overflow: { x: 'hidden', y: 'scroll' },
                                paddingAbsolute: true
                            }}
                            events={{ scroll: (instance) => handleScroll(instance) }}
                            className="collab-pl-tracks-scrollbar"
                        >
                            <div className="collab-pl-tracks-scroll">
                                {tracks.map((track: Track, index: number) => (
                                    <div key={track.id} className="collab-pl-track-card">
                                        <p className="collab-pl-track-number">{index + 1}</p>
                                        <a
                                            href={`https://open.spotify.com/track/${track.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <img 
                                                className="collab-pl-track-cover"
                                                src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                                alt={track.name}
                                            />
                                        </a>
                                        
                                        <a 
                                            className="collab-pl-track-name underline-on-hover"
                                            href={`https://open.spotify.com/track/${track.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {track.name}
                                        </a>
                                        <span className="collab-pl-track-artists">
                                            &nbsp;•{" "}
                                            {track.artists.map((artist: any, index: number) => (
                                                <span key={artist.id ?? artist.name}>
                                                <a
                                                    className="underline-on-hover"
                                                    href={`https://open.spotify.com/artist/${artist.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {artist.name}
                                                </a>
                                                {index < track.artists.length - 1 && ", "}
                                                </span>
                                            ))}
                                        </span>
                                        <button 
                                            className="collab-pl-track-button-delete"
                                            onClick={() => {
                                                setTrackToDelete(track)
                                                setShowDeleteModal(true)
                                            }}
                                        >
                                            <img src="/minus.png" alt="Delete" className="collab-pl-track-button-delete-icon"></img>
                                        </button>
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
                        onKeyDown={(e) => e.key === 'Enter' && search()}
                        placeholder="Search for tracks..."
                    />
                    <button 
                        className="search-button"
                        onClick={search}
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
                                        <a
                                            href={`https://open.spotify.com/track/${track.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <img 
                                                className="track-cover"
                                                src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                                alt={track.name}
                                            />
                                        </a>
                                        
                                        <div className="track-info">
                                            <a 
                                                className="track-name underline-on-hover"
                                                href={`https://open.spotify.com/track/${track.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {track.name}
                                            </a>
                                            <p>
                                                {track.artists.map((artist: any, index: number) => (
                                                    <span key={artist.id ?? artist.name}>
                                                    <a
                                                        className="underline-on-hover"
                                                        href={`https://open.spotify.com/artist/${artist.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {artist.name}
                                                    </a>
                                                    {index < track.artists.length - 1 && ", "}
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                        <button 
                                            className="track-button-add"
                                            onClick={() => addTrack(track)}
                                        >
                                            <img src="/plus.png" alt="Add" className="track-button-add-icon"></img>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </OverlayScrollbarsComponent>
                    </div>
                </div>
            </div>
        </div>
        {showDeleteModal && (
            <div 
                className="delete-modal-overlay" 
                onClick={() => setShowDeleteModal(false)}
            >
                <div 
                    className="delete-modal-content" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3>
                        Delete Track?
                    </h3>
                    <p>
                        Are you sure you want to remove "{trackToDelete?.name}" from the playlist?
                    </p>
                    <div 
                        className="delete-modal-buttons"
                    >
                        <button 
                            className="delete-modal-button-confirm"
                            onClick={() => {
                                if (trackToDelete) deleteTrack(trackToDelete)
                                setShowDeleteModal(false)
                            }}
                        >
                            Delete
                        </button>
                        <button 
                            className="delete-modal-button-cancel"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancel
                        </button>
                        
                    </div>
                </div>
            </div>
            )}

    </div>
    
  )
}