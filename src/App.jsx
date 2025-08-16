/* global qortalRequest */
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchRecentAudioFiles, getAudioMetadata, getThumbnailUrl } from './services/qdnService';
import AllSongs from './components/AllSongs';
import audioPlayer from './services/audioPlayerService';
import AudioCard from './components/AudioCard';
import AddMusicForm from './components/AddMusicForm';
import UploadSongForm from './components/UploadSongForm';
import Header from './components/Header';
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

  // Load tracks on mount
  useEffect(() => {
    loadRecentTracks();
  }, [loadRecentTracks]);

  // Handle login
  const handleLogin = async () => {
    console.log('Login button clicked!');
    
    if (typeof qortalRequest === 'undefined') {
      console.log('ERROR: QORTAL API not available - are you using QORTAL browser?');
      alert('Login requires QORTAL browser!');
      return;
    }

    try {
      // First get the current user account
      console.log('Getting user account...');
      const accountResponse = await qortalRequest({
        action: 'GET_USER_ACCOUNT'
      });
      console.log('Account response:', accountResponse);

      if (!accountResponse || !accountResponse.address) {
        console.log('No account received');
        alert('Login failed: Could not get user account. Are you logged into QORTAL?');
        return;
      }

      // Then get the name for this account
      console.log('Getting names for address:', accountResponse.address);
      const namesResponse = await qortalRequest({
        action: 'GET_ACCOUNT_NAMES',
        address: accountResponse.address,
        limit: 20,
        offset: 0,
        reverse: false
      });
      console.log('Names response:', namesResponse);

      if (Array.isArray(namesResponse) && namesResponse.length > 0) {
        const userToSet = { 
          name: namesResponse[0].name,
          address: accountResponse.address 
        };
        setCurrentUser(userToSet);
        console.log(`Success! Logged in as: ${userToSet.name}`);
      } else {
        console.log('No names found for address');
        // If no name, use address as fallback
        const userToSet = { 
          name: accountResponse.address,
          address: accountResponse.address 
        };
        setCurrentUser(userToSet);
        console.log(`Logged in with address: ${accountResponse.address}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        toString: error.toString()
      });
      alert('Login error: ' + (error.message || error.toString() || 'Unknown error'));
    }
  };

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      setCurrentTrack(track);
      audioPlayer.play(track);
      setIsPlaying(true);
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
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="main-content">
            <div className="content-area">
              <Routes>
                <Route path="/all-songs" element={<AllSongs onPlay={handlePlayTrack} />} />
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
                          recentTracks.map(track => (
                            <AudioCard 
                              key={track.id} 
                              audio={track}
                              isPlaying={isPlaying && currentTrack?.id === track.id}
                              onPlay={handlePlayTrack}
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
                      console.log('Raw button click event:', e);
                      handleLogin();
                    }}
                    style={{ position: 'relative', zIndex: 1000 }}
                  >
                    🔐 Login
                  </button>
                )}
              </div>
              
              <nav className="side-menu">
                <div className="menu-section">
                  <h3>Navigation</h3>
                  <Link to="/" className="sidebar-link">
                    <span className="sidebar-icon">🏠</span>
                    <span>Home</span>
                  </Link>
                  <Link to="/all-songs" className="sidebar-link">
                    <span className="sidebar-icon">🎵</span>
                    <span>All Songs</span>
                  </Link>
                  <Link to="/playlists" className="sidebar-link">
                    <span className="sidebar-icon">📑</span>
                    <span>All Playlists</span>
                  </Link>
                </div>

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
              <div className="player-controls">
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
                <div className="player-buttons">
                  <button 
                    className="play-button" 
                    onClick={() => handlePlayTrack(currentTrack)}
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
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
