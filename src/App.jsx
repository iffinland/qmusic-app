/* global qortalRequest */
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecentAudioFiles, getAudioMetadata, getThumbnailUrl } from './services/qdnService';
import audioPlayer from './services/audioPlayerService';
import AudioCard from './components/AudioCard';
import AddMusicForm from './components/AddMusicForm';
import UploadSongForm from './components/UploadSongForm';
import './styles.css';

// Helper function to extract title from identifier
const extractTitleFromIdentifier = (identifier) => {
  if (!identifier) return null;
  
  console.log(`=== TITLE EXTRACTION ===`);
  console.log(`Input identifier: "${identifier}"`);
  
  // For qmusic_track_title_RANDOMCODE format
  if (identifier.startsWith('qmusic_track_')) {
    const parts = identifier.split('_');
    console.log(`qmusic_track parts:`, parts);
    
    if (parts.length >= 4) {
      const titleParts = parts.slice(2, -1);
      const title = titleParts.join(' ');
      console.log(`Extracted title (track format): "${title}"`);
      return title;
    }
  }
  
  // For qmusic_song_artist_title_RANDOMCODE format  
  if (identifier.startsWith('qmusic_song_')) {
    const parts = identifier.split('_');
    
    if (parts.length >= 5) {
      const titleParts = parts.slice(3, -1);
      const title = titleParts.join(' ');
      console.log(`Extracted title (song format): "${title}"`);
      return title;
    }
  }
  
  // For earbump_song_title_RANDOMCODE format
  if (identifier.startsWith('earbump_song_')) {
    const parts = identifier.split('_');
    
    if (parts.length >= 4) {
      const titleParts = parts.slice(2, -1);
      const title = titleParts.join(' ');
      console.log(`Extracted title (earbump format): "${title}"`);
      return title;
    }
  }
  
  console.log(`No matching pattern found for identifier: "${identifier}"`);
  return null;
};

// Helper function to extract artist from identifier
const extractArtistFromIdentifier = (identifier) => {
  if (!identifier) return null;
  
  console.log(`=== ARTIST EXTRACTION ===`);
  console.log(`Input identifier: "${identifier}"`);
  
  if (identifier.startsWith('qmusic_song_')) {
    const parts = identifier.split('_');
    
    if (parts.length >= 4) {
      const artist = parts[2];
      console.log(`Extracted artist: "${artist}"`);
      return artist;
    }
  }
  
  return null;
};

function App() {
  const [recentTracks, setRecentTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Audio player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'one', 'all'
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playQueue, setPlayQueue] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // Load recent tracks
  const loadRecentTracks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('=== LOADING RECENT TRACKS ===');
      
      const files = await fetchRecentAudioFiles();
      console.log('Raw files from API:', files);
      
      if (!files || files.length === 0) {
        console.log('No files returned from API');
        setRecentTracks([]);
        return;
      }

      // Process tracks with metadata
      const tracksWithMetadata = await Promise.all(
        files.map(async (file) => {
          try {
            console.log(`Processing file: ${file.name}/${file.service}/${file.identifier}`);
            
            // Get metadata for the file
            const metadata = await getAudioMetadata(file.name, file.service, file.identifier);
            
            console.log(`=== PROCESSING TRACK ===`);
            console.log(`File name: ${file.name}`);
            console.log(`Service: ${file.service}`);
            console.log(`Identifier: ${file.identifier}`);
            console.log(`Metadata:`, metadata);
            
            // Parse title and artist from description
            let parsedTitle = null;
            let parsedArtist = null;
            
            if (metadata?.description) {
              console.log(`Raw description: "${metadata.description}"`);
              
              // Parse "title=Song Name;author=Artist Name" format
              const titleMatch = metadata.description.match(/title=([^;]+)/);
              const authorMatch = metadata.description.match(/author=([^;]+)/);
              
              if (titleMatch) {
                parsedTitle = titleMatch[1].trim();
                console.log(`Parsed title from description: "${parsedTitle}"`);
              }
              
              if (authorMatch) {
                parsedArtist = authorMatch[1].trim();
                console.log(`Parsed artist from description: "${parsedArtist}"`);
              }
            }
            
            // If no title in metadata, try to extract from identifier
            if (!parsedTitle) {
              console.log('No title in metadata, trying identifier extraction...');
              parsedTitle = extractTitleFromIdentifier(file.identifier);
            }
            
            // If no artist in metadata, try to extract from identifier  
            if (!parsedArtist) {
              console.log('No artist in metadata, trying identifier extraction...');
              parsedArtist = extractArtistFromIdentifier(file.identifier);
            }
            
            // Final fallback
            const finalTitle = parsedTitle || file?.metadata?.title || file.name;
            const finalArtist = parsedArtist || 'Unknown Artist';
            
            console.log(`=== FINAL RESULT ===`);
            console.log(`Title: ${finalTitle}`);
            console.log(`Artist: ${finalArtist}`);
            console.log(`Uploader: ${file.name}`);
            console.log(`====================`);

            return {
              id: `${file.name}_${file.service}_${file.identifier}`,
              title: finalTitle,
              artist: finalArtist,
              uploader: file.name,
              thumbnail: getThumbnailUrl(file.name, file.identifier),
              ...file
            };
          } catch (error) {
            console.warn(`Error processing track ${file.name}:`, error);
            
            const extractedArtist = extractArtistFromIdentifier(file.identifier);
            
            return {
              id: `${file.name}_${file.service}_${file.identifier}`,
              title: extractTitleFromIdentifier(file.identifier) || file.name,
              artist: extractedArtist || 'Unknown Artist',
              uploader: file.name,
              thumbnail: getThumbnailUrl(file.name, file.identifier),
              ...file
            };
          }
        })
      );

      console.log('Tracks with metadata:', tracksWithMetadata);
      
      // Filter and prioritize user's own tracks
      const prioritizedTracks = tracksWithMetadata.sort((a, b) => {
        const aIsOwn = a.id && (
          a.id.includes('Q-Music_AUDIO_qmusic_track_') || 
          a.id.includes('Q-Music_AUDIO_qmusic_song_') ||
          a.id.includes('iffi vaba mees_AUDIO_qmusic_song_') ||
          a.id.includes('iffi forest life_AUDIO_qmusic_song_') ||
          a.name === 'Q-Music' ||
          (a.name && a.name.toLowerCase().includes('iffi'))
        );
        
        const bIsOwn = b.id && (
          b.id.includes('Q-Music_AUDIO_qmusic_track_') || 
          b.id.includes('Q-Music_AUDIO_qmusic_song_') ||
          b.id.includes('iffi vaba mees_AUDIO_qmusic_song_') ||
          b.id.includes('iffi forest life_AUDIO_qmusic_song_') ||
          b.name === 'Q-Music' ||
          (b.name && b.name.toLowerCase().includes('iffi'))
        );
        
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        
        // Then sort by timestamp descending (newest first)
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      
      console.log('Prioritized tracks:', prioritizedTracks);
      
      setRecentTracks(prioritizedTracks);
      
    } catch (error) {
      console.error('Error loading tracks:', error);
      setError(error.message || 'Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio player event listeners
  useEffect(() => {
    const timeUpdateCleanup = audioPlayer.onTimeUpdate(() => {
      setCurrentTime(audioPlayer.getCurrentTime());
      setDuration(audioPlayer.getDuration() || 0);
    });

    const endedCleanup = audioPlayer.onEnded(() => {
      setIsPlaying(false);
      // Directly handle next track without function dependency
      if (playQueue.length === 0) return;

      let nextIndex;
      if (repeatMode === 'one') {
        nextIndex = currentTrackIndex;
      } else if (isShuffled) {
        nextIndex = Math.floor(Math.random() * playQueue.length);
      } else if (repeatMode === 'all' && currentTrackIndex === playQueue.length - 1) {
        nextIndex = 0;
      } else if (currentTrackIndex < playQueue.length - 1) {
        nextIndex = currentTrackIndex + 1;
      } else {
        return;
      }

      const nextTrack = playQueue[nextIndex];
      if (nextTrack) {
        // Inline play logic to avoid dependency issues
        setCurrentTrack(nextTrack);
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
        audioPlayer.play(nextTrack).catch(console.error);
      }
    });

    const errorCleanup = audioPlayer.onError(() => {
      setIsPlaying(false);
      console.error('Audio playback error');
    });

    return () => {
      timeUpdateCleanup();
      endedCleanup();
      errorCleanup();
    };
  }, [playQueue, currentTrackIndex, repeatMode, isShuffled]);

  // Update play queue when tracks change
  useEffect(() => {
    if (recentTracks.length > 0 && playQueue.length === 0) {
      setPlayQueue([...recentTracks]);
    }
  }, [recentTracks, playQueue.length]);

  // Set volume on audio player
  useEffect(() => {
    audioPlayer.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Load tracks on mount
  useEffect(() => {
    loadRecentTracks();
  }, [loadRecentTracks]);

  // Handle login
  const handleLogin = async () => {
    try {
      if (typeof qortalRequest !== 'undefined') {
        const response = await qortalRequest({
          action: 'GET_USER_ACCOUNT'
        });
        
        if (response?.name) {
          setCurrentUser({ name: response.name });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Enhanced audio player functions
  const handlePlayTrack = async (track, trackIndex = null) => {
    try {
      if (currentTrack?.id === track.id && isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        setCurrentTrack(track);
        setIsPlaying(true);
        
        if (trackIndex !== null) {
          setCurrentTrackIndex(trackIndex);
        } else {
          const index = playQueue.findIndex(t => t.id === track.id);
          setCurrentTrackIndex(index !== -1 ? index : 0);
        }
        
        await audioPlayer.play(track);
      }
    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
    }
  };

  const handleNextTrack = () => {
    if (playQueue.length === 0) return;

    let nextIndex;
    
    if (repeatMode === 'one') {
      // Repeat current song
      nextIndex = currentTrackIndex;
    } else if (isShuffled) {
      // Random next track
      nextIndex = Math.floor(Math.random() * playQueue.length);
    } else if (repeatMode === 'all' && currentTrackIndex === playQueue.length - 1) {
      // Repeat playlist from beginning
      nextIndex = 0;
    } else if (currentTrackIndex < playQueue.length - 1) {
      // Normal next track
      nextIndex = currentTrackIndex + 1;
    } else {
      // End of playlist
      setIsPlaying(false);
      return;
    }

    const nextTrack = playQueue[nextIndex];
    if (nextTrack) {
      handlePlayTrack(nextTrack, nextIndex);
    }
  };

  const handlePreviousTrack = () => {
    if (playQueue.length === 0) return;

    let prevIndex;
    
    if (currentTime > 3) {
      // If more than 3 seconds played, restart current song
      audioPlayer.seek(0);
      return;
    }
    
    if (isShuffled) {
      // Random previous track
      prevIndex = Math.floor(Math.random() * playQueue.length);
    } else if (currentTrackIndex > 0) {
      // Normal previous track
      prevIndex = currentTrackIndex - 1;
    } else if (repeatMode === 'all') {
      // Go to end of playlist
      prevIndex = playQueue.length - 1;
    } else {
      // Beginning of playlist
      prevIndex = 0;
    }

    const prevTrack = playQueue[prevIndex];
    if (prevTrack) {
      handlePlayTrack(prevTrack, prevIndex);
    }
  };

  const handleSeek = (newTime) => {
    audioPlayer.seek(newTime);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleShuffleToggle = () => {
    setIsShuffled(!isShuffled);
  };

  const handleRepeatToggle = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (currentTrack) {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleMusicAdded = (newTrack) => {
    if (newTrack) {
      console.log('Adding new track to UI:', newTrack);
      setRecentTracks(prev => [newTrack, ...prev]);
    } else {
      console.log('Refreshing tracks from QDN...');
      loadRecentTracks();
    }
  };

  return (
    <Router>
      <div className="app">
        <div className="app-container">
          <header className="header">
            <div className="header-content">
              <div className="header-left">
                <button
                  className="hamburger-menu"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  ☰
                </button>
              </div>
              
              <div className="header-center">
                <div className="search-container">
                  <input 
                    type="text" 
                    placeholder="Search songs, artists..." 
                    className="search-input"
                  />
                  <button className="search-button">🔍</button>
                </div>
              </div>
              
              <div className="header-right">
                <div className="logo">
                  <img src="/qmusic.png" alt="Q-Music" />
                </div>
              </div>
            </div>
          </header>
          
          <main className="main-content">
            <div className="content-area">
              <Routes>
                <Route path="/" element={
                  <div className="home-container">
                    <section className="section">
                      <h2 className="section-title">Recently Added Songs</h2>
                      <div className="horizontal-scroll-container">
                        {isLoading ? (
                          <div className="loading-message">Loading songs...</div>
                        ) : error ? (
                          <div className="error-message">{error}</div>
                        ) : recentTracks.length === 0 ? (
                          <div className="empty-message">No songs found</div>
                        ) : (
                          recentTracks.map((track, index) => (
                            <AudioCard 
                              key={track.id} 
                              audio={track}
                              isPlaying={isPlaying && currentTrack?.id === track.id}
                              onPlay={() => handlePlayTrack(track, index)}
                            />
                          ))
                        )}
                      </div>
                    </section>
                    
                    <section className="section">
                      <h2 className="section-title">Recently Created Playlists</h2>
                      <div className="horizontal-scroll-container">
                        {/* Playlist cards will be added here */}
                      </div>
                    </section>
                  </div>
                } />
                <Route path="/add-music" element={<AddMusicForm currentUser={currentUser} onMusicAdded={handleMusicAdded} />} />
                <Route path="/upload" element={<AddMusicForm currentUser={currentUser} onMusicAdded={handleMusicAdded} />} />
              </Routes>
            </div>
          </main>

          <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-content">
              {/* User Section */}
              <div className="user-section">
                {currentUser ? (
                  <div className="user-info">
                    <div className="user-avatar">👤</div>
                    <span className="user-name">{currentUser.name}</span>
                  </div>
                ) : (
                  <button 
                    className="sidebar-login-button" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Button clicked - event fired');
                      handleLogin();
                    }}
                    style={{
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      zIndex: 9999
                    }}
                  >
                    🔐 Login
                  </button>
                )}
              </div>
              
              <nav className="side-menu">
                {currentUser && (
                  <div className="menu-section publish-section">
                    <h3>Actions</h3>
                    <Link to="/upload" className="sidebar-link publish-link">
                      <span className="sidebar-icon">📤</span>
                      PUBLISH SONG
                    </Link>
                  </div>
                )}
                
                {/* Statistics - always visible */}
                <div className="menu-section">
                  <h3>Statistics</h3>
                  <div className="stat-item">
                    <span>All songs on QDN</span>
                    <span>0</span>
                  </div>
                  <div className="stat-item">
                    <span>Q-Music songs</span>
                    <span>0</span>
                  </div>
                  <div className="stat-item">
                    <span>Ear Bump songs</span>
                    <span>0</span>
                  </div>
                  <div className="stat-item">
                    <span>Publishers</span>
                    <span>0</span>
                  </div>
                </div>
                
                {currentUser && (
                  <div className="menu-section">
                    <h3>Your Library</h3>
                    <h4>Playlists</h4>
                    {/* Playlists will be listed here */}
                  </div>
                )}
                
                {/* Info box and links at bottom */}
                <div className="sidebar-info-box">
                  <p>Q-Music is a decentralized music platform built on the QORTAL blockchain. 
                  Discover, share, and publish music in a truly decentralized ecosystem.</p>
                </div>
                
                <div className="sidebar-bottom-links">
                  <a href="#" className="bottom-link">Q-MAIL</a>
                  <a href="#" className="bottom-link">Q-CHAT</a>
                  <a href="#" className="bottom-link">FAQ</a>
                </div>
              </nav>
            </div>
          </aside>
          {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

          <footer className="player">
            {currentTrack ? (
              <div className="enhanced-player-controls">
                <div className="player-main">
                  <div className="track-info">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt={currentTrack.title} className="track-image" />
                    ) : (
                      <div className="track-image-placeholder">🎵</div>
                    )}
                    <div className="track-details">
                      <h4>{currentTrack.title}</h4>
                      <p>{currentTrack.artist}</p>
                    </div>
                  </div>
                  
                  <div className="player-controls">
                    <div className="control-buttons">
                      <button 
                        className={`control-button ${isShuffled ? 'active' : ''}`}
                        onClick={handleShuffleToggle}
                        title="Shuffle"
                      >
                        🔀
                      </button>
                      
                      <button 
                        className="control-button"
                        onClick={handlePreviousTrack}
                        title="Previous"
                      >
                        ⏮️
                      </button>
                      
                      <button 
                        className="play-button-main" 
                        onClick={handlePlayPause}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>
                      
                      <button 
                        className="control-button"
                        onClick={handleNextTrack}
                        title="Next"
                      >
                        ⏭️
                      </button>
                      
                      <button 
                        className={`control-button ${repeatMode !== 'off' ? 'active' : ''}`}
                        onClick={handleRepeatToggle}
                        title={`Repeat ${repeatMode}`}
                      >
                        {repeatMode === 'one' ? '🔂' : '🔁'}
                      </button>
                    </div>
                    
                    <div className="progress-section">
                      <span className="time-display">{formatTime(currentTime)}</span>
                      <div className="progress-container">
                        <input
                          type="range"
                          className="progress-bar"
                          value={duration ? (currentTime / duration) * 100 : 0}
                          onChange={(e) => {
                            const newTime = (e.target.value / 100) * duration;
                            handleSeek(newTime);
                          }}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <span className="time-display">{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  <div className="volume-controls">
                    <button 
                      className="volume-button"
                      onClick={handleMuteToggle}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? '🔇' : volume > 0.5 ? '🔊' : volume > 0 ? '🔉' : '🔈'}
                    </button>
                    <div className="volume-container">
                      <input
                        type="range"
                        className="volume-slider"
                        value={isMuted ? 0 : volume * 100}
                        onChange={(e) => handleVolumeChange(e.target.value / 100)}
                        min="0"
                        max="100"
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="player-placeholder">
                Select a song to play
              </div>
            )}
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
