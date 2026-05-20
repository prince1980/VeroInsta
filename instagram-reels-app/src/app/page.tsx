'use client';

import { useState } from 'react';

type Reel = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration?: number;
  viewCount?: number;
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingCount, setDownloadingCount] = useState(0);

  const fetchReels = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setReels([]);
    setSelectedIds(new Set());

    try {
      const res = await fetch('/api/fetch-reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch reels');
      }

      setReels(data.reels);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setDownloadingCount(selectedIds.size);
    const selectedReels = reels.filter(r => selectedIds.has(r.id));
    
    // We download them in parallel but sequentially trigger window.open or fetch
    // To avoid browser popup blockers and allow saving, we can fetch the blob 
    // and trigger a download via object URL.
    
    for (const reel of selectedReels) {
      try {
        const res = await fetch('/api/download-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: reel.url }),
        });
        
        const data = await res.json();
        
        if (data.downloadUrl) {
          // Trigger download
          const a = document.createElement('a');
          a.href = data.downloadUrl;
          a.download = `Reel-${reel.id}.mp4`;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Failed to download reel:', reel.id, err);
      }
      // slight delay to prevent overwhelming the browser
      await new Promise(r => setTimeout(r, 500));
    }
    
    setDownloadingCount(0);
    // Optionally clear selection after download
    setSelectedIds(new Set());
  };

  return (
    <main className="main-content container">
      <section className="header-section">
        <h1>Download Instagram Reels</h1>
        <p>Paste a profile or reel URL below to fetch and download high-quality videos instantly.</p>
        
        <div className="search-container">
          <input 
            type="text" 
            className="search-input" 
            placeholder="https://www.instagram.com/username/reels/" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReels()}
          />
          <button 
            className={`btn btn-primary search-button ${loading ? 'btn-disabled' : ''}`}
            onClick={fetchReels}
            disabled={loading}
          >
            {loading ? <span className="loader"></span> : 'Fetch Reels'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </section>

      {reels.length > 0 && (
        <div className="reels-grid">
          {reels.map((reel) => (
            <div 
              key={reel.id} 
              className={`reel-card ${selectedIds.has(reel.id) ? 'selected' : ''}`}
              onClick={() => toggleSelection(reel.id)}
            >
              <div className="selection-indicator"></div>
              {reel.thumbnail ? (
                <img src={reel.thumbnail} alt={reel.title} className="reel-thumbnail" loading="lazy" />
              ) : (
                <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333'}}>
                  <span style={{color: 'white'}}>No Thumbnail</span>
                </div>
              )}
              <div className="reel-overlay">
                <div className="reel-title">{reel.title}</div>
                {(reel.viewCount || reel.duration) && (
                  <div className="reel-stats">
                    {reel.viewCount ? `${(reel.viewCount / 1000).toFixed(1)}k views • ` : ''}
                    {reel.duration ? `${reel.duration}s` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Bar */}
      <div className={`download-bar ${selectedIds.size > 0 ? 'visible' : ''}`}>
        <div className="download-info">
          {selectedIds.size} reel{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
        <button 
          className={`btn btn-primary ${downloadingCount > 0 ? 'btn-disabled' : ''}`}
          onClick={downloadSelected}
          disabled={downloadingCount > 0}
        >
          {downloadingCount > 0 ? (
             <><span className="loader" style={{width: '18px', height: '18px', marginRight: '8px', borderWidth: '2px'}}></span> Downloading...</>
          ) : (
            `Download Selected`
          )}
        </button>
      </div>
    </main>
  );
}
