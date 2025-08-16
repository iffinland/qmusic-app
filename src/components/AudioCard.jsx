const AudioCard = ({ audio, isPlaying, onPlay, className = '' }) => {
  const { title, artist, uploader, thumbnail } = audio;

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  return (
    <div className={`audio-card ${isPlaying ? 'playing' : ''} ${className}`} onClick={() => onPlay(audio)}>
      <div className="audio-card-image">
        {thumbnail ? (
          <>
            <img 
              src={thumbnail} 
              alt={title} 
              className="card-image" 
              onError={handleImageError}
              style={{ display: 'block' }}
            />
            <div className="card-image-placeholder" style={{ display: 'none' }}>
              🎵
            </div>
          </>
        ) : (
          <div className="card-image-placeholder">
            🎵
          </div>
        )}
        <div className="play-overlay">
          <span className="play-icon">{isPlaying ? '⏸️' : '▶️'}</span>
        </div>
      </div>
      <div className="audio-card-content">
        <h3 className="audio-card-title">{title || 'Unknown Title'}</h3>
        <p className="audio-card-artist">{artist || 'Unknown Artist'}</p>
        {uploader && (
          <p className="audio-card-uploader">by {uploader}</p>
        )}
      </div>
    </div>
  );
};

export default AudioCard;
