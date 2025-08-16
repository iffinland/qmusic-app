import React, { useState, useEffect } from 'react';
import { fetchRecentAudioFiles, getAudioMetadata, getThumbnailUrl } from '../services/qdnService';
import AudioCard from './AudioCard';
import '../styles.css';
import '../styles/allSongs.css';

// Helper function to extract title from identifier (copied from App.jsx)
const extractTitleFromIdentifier = (identifier) => {
  if (!identifier) return null;
  
  // For qmusic_track_title_RANDOMCODE format
  if (identifier.startsWith('qmusic_track_')) {
    const parts = identifier.split('_');
    if (parts.length >= 4) {
      const titleParts = parts.slice(2, -1);
      const title = titleParts.join(' ');
      return title;
    }
  }
  
  // For qmusic_song_artist_title_RANDOMCODE format  
  if (identifier.startsWith('qmusic_song_')) {
    const parts = identifier.split('_');
    if (parts.length >= 5) {
      const titleParts = parts.slice(3, -1);
      const title = titleParts.join(' ');
      return title;
    }
  }
  
  // For earbump_song_title_RANDOMCODE format
  if (identifier.startsWith('earbump_song_')) {
    const parts = identifier.split('_');
    if (parts.length >= 4) {
      const titleParts = parts.slice(2, -1);
      const title = titleParts.join(' ');
      return title;
    }
  }
  
  return null;
};

// Helper function to extract artist from identifier (copied from App.jsx)
const extractArtistFromIdentifier = (identifier) => {
  if (!identifier) return null;
  
  if (identifier.startsWith('qmusic_song_')) {
    const parts = identifier.split('_');
    if (parts.length >= 4) {
      const artist = parts[2];
      return artist;
    }
  }
  
  return null;
};

const AllSongs = ({ onPlay }) => {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState('All');
  const alphabet = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [songsPerPage] = useState(25);
  
  // Platform filter state
  const [platformFilter, setPlatformFilter] = useState('All');

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load a larger batch for the full list
      const files = await fetchRecentAudioFiles(100, 0);
      
      console.log("AllSongs got files from QDN:", files.length);
      
      if (!files || files.length === 0) {
        console.log("No files returned from QDN API");
        setSongs([]);
        setIsLoading(false);
        setError("No songs found in QDN. Please check your connection to Qortal.");
        return;
      }

      // Process tracks with metadata
      const tracksWithMetadata = await Promise.all(
        files.map(async (file) => {
          try {
            // Get metadata for the file
            const metadata = await getAudioMetadata(file.name, file.service, file.identifier);
            
            // Parse title and artist from description
            let parsedTitle = null;
            let parsedArtist = null;
            
            if (metadata?.description) {
              // Parse "title=Song Name;author=Artist Name" format
              const titleMatch = metadata.description.match(/title=([^;]+)/);
              const authorMatch = metadata.description.match(/author=([^;]+)/);
              
              if (titleMatch) {
                parsedTitle = titleMatch[1].trim();
              }
              
              if (authorMatch) {
                parsedArtist = authorMatch[1].trim();
              }
            }
            
            // If no title in metadata, try to extract from identifier
            if (!parsedTitle) {
              parsedTitle = extractTitleFromIdentifier(file.identifier);
            }
            
            // If no artist in metadata, try to extract from identifier  
            if (!parsedArtist) {
              parsedArtist = extractArtistFromIdentifier(file.identifier);
            }
            
            // Final fallback
            const finalTitle = parsedTitle || file?.metadata?.title || file.name;
            const finalArtist = parsedArtist || 'Unknown Artist';
            
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
      
      setSongs(tracksWithMetadata);
      console.log("Processed songs data:", tracksWithMetadata);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading songs:', error);
      setError('Failed to load songs: ' + error.message);
      setIsLoading(false);
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLetter, platformFilter]);

  // Filter songs by platform first
  const platformFilteredSongs = songs.filter(song => {
    if (platformFilter === 'All') return true;
    
    if (platformFilter === 'Q-Music') {
      return song.identifier && (
        song.identifier.startsWith('qmusic_track_') ||
        song.identifier.startsWith('qmusic_song_')
      );
    }
    
    if (platformFilter === 'Ear Bump') {
      return song.identifier && song.identifier.startsWith('earbump_song_');
    }
    
    return true;
  });

  // Then filter by letter
  const filteredSongs = selectedLetter === 'All' 
    ? platformFilteredSongs 
    : platformFilteredSongs.filter(song => {
        // Get the first letter to filter by
        let firstChar;

        // Try artist first
        if (song.artist && song.artist !== 'Unknown Artist') {
          firstChar = song.artist.charAt(0).toUpperCase();
        } 
        // If no artist, try title
        else if (song.title) {
          firstChar = song.title.charAt(0).toUpperCase();
        }
        // If no title either, try uploader name
        else if (song.uploader) {
          firstChar = song.uploader.charAt(0).toUpperCase();
        }
        // Last resort: name field
        else if (song.name) {
          firstChar = song.name.charAt(0).toUpperCase();
        }
        // If nothing found, put in "Others"
        else {
          firstChar = '#';
        }
        
        return firstChar === selectedLetter;
      });
      
  // Get current songs for pagination
  const indexOfLastSong = currentPage * songsPerPage;
  const indexOfFirstSong = indexOfLastSong - songsPerPage;
  const currentSongs = filteredSongs.slice(indexOfFirstSong, indexOfLastSong);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredSongs.length / songsPerPage);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Go to previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Go to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="all-songs-container">
      <h1 className="page-title">All Songs</h1>
      
      {/* Platform filter */}
      <div className="platform-filter">
        <button
          className={`platform-button ${platformFilter === 'All' ? 'active' : ''}`}
          onClick={() => setPlatformFilter('All')}
        >
          All Platforms
        </button>
        <button
          className={`platform-button q-music ${platformFilter === 'Q-Music' ? 'active' : ''}`}
          onClick={() => setPlatformFilter('Q-Music')}
        >
          Q-Music Only
        </button>
        <button
          className={`platform-button ear-bump ${platformFilter === 'Ear Bump' ? 'active' : ''}`}
          onClick={() => setPlatformFilter('Ear Bump')}
        >
          Ear Bump Only
        </button>
      </div>
      
      {/* Alphabet filter */}
      <div className="alphabet-filter">
        {alphabet.map((letter) => (
          <button
            key={letter}
            className={`letter-button ${selectedLetter === letter ? 'active' : ''}`}
            onClick={() => setSelectedLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading-message">Loading songs...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : filteredSongs.length === 0 ? (
        <div className="empty-message">No songs found</div>
      ) : (
        <>
          <div className="songs-grid">
            {currentSongs.map((song) => (
              <AudioCard
                key={song.id}
                audio={song}
                isPlaying={false}
                onPlay={() => onPlay(song)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={goToPreviousPage} 
                className={`pagination-button ${currentPage === 1 ? 'disabled' : ''}`}
                disabled={currentPage === 1}
              >
                &laquo; Previous
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  // Show only a reasonable number of page buttons
                  .filter(num => {
                    // Always show first and last pages
                    if (num === 1 || num === totalPages) return true;
                    // Show pages near current page
                    if (Math.abs(num - currentPage) <= 2) return true;
                    // Show ellipsis placeholder
                    if (num === currentPage - 3 || num === currentPage + 3) return true;
                    return false;
                  })
                  .map((number, index, array) => {
                    // If there's a gap, show ellipsis
                    if (index > 0 && array[index] - array[index-1] > 1) {
                      return (
                        <span key={`ellipsis-${number}`} className="pagination-ellipsis">...</span>
                      );
                    }
                    
                    return (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`page-number ${currentPage === number ? 'active' : ''}`}
                      >
                        {number}
                      </button>
                    );
                  })}
              </div>
              
              <button 
                onClick={goToNextPage} 
                className={`pagination-button ${currentPage === totalPages ? 'disabled' : ''}`}
                disabled={currentPage === totalPages}
              >
                Next &raquo;
              </button>
            </div>
          )}
          
          <div className="pagination-info">
            Showing {indexOfFirstSong + 1}-{Math.min(indexOfLastSong, filteredSongs.length)} of {filteredSongs.length} songs
            {platformFilter !== 'All' && ` (${platformFilter} only)`}
          </div>
        </>
      )}
    </div>
  );
};

export default AllSongs;
