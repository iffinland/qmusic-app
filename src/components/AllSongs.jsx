import React, { useState, useEffect } from 'react';
import { fetchRecentAudioFiles } from '../services/qdnService';
import AudioCard from './AudioCard';
import '../styles.css';

const AllSongs = ({ onPlay }) => {
  const [songs, setSongs] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState('All');
  const alphabet = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      // Load a larger batch for the full list
      const allSongs = await fetchRecentAudioFiles(100, 0);
      setSongs(allSongs);
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const filteredSongs = selectedLetter === 'All' 
    ? songs 
    : songs.filter(song => {
        const artistName = song.name.toLowerCase();
        return artistName.startsWith(selectedLetter.toLowerCase());
      });

  return (
    <div className="all-songs-container">
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

      <div className="songs-grid">
        {filteredSongs.map((song) => (
          <AudioCard
            key={song.id}
            track={song}
            onPlay={() => onPlay(song)}
          />
        ))}
      </div>
    </div>
  );
};

export default AllSongs;
