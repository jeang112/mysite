import React, { useEffect, useRef, useState } from "react";

/**
 * YouTube Jukebox
 * - Requires a YouTube Data API v3 key (set in REACT_APP_YT_API_KEY below or replace directly)
 * - Uses YouTube IFrame Player API to detect ended state and auto-advance the queue.
 */

const API_KEY = process.env.REACT_APP_YT_API_KEY || "AIzaSyCFI__LFEbvmy7aULYvNRvr37rdAVasDHU";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [queue, setQueue] = useState([]); // {id,title,thumb}
  const [current, setCurrent] = useState(null); // videoId
  const playerRef = useRef(null);
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    // load YT IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    // onYouTubeIframeAPIReady will be called by YT; attach it
    window.onYouTubeIframeAPIReady = () => {
      ytPlayerRef.current = new window.YT.Player("player", {
        height: "360",
        width: "640",
        videoId: current,
        playerVars: { autoplay: 0, controls: 1 },
        events: {
          onStateChange: (e) => {
            // 0 = ended
            if (e.data === window.YT.PlayerState.ENDED) {
              playNext();
            }
          },
        },
      });
    };
    // cleanup on unmount
    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when current changes, load the video in the player
  useEffect(() => {
    if (ytPlayerRef.current && current) {
      try {
        ytPlayerRef.current.loadVideoById(current);
      } catch (err) {
        // if player not ready, we set video via creating a new player
        ytPlayerRef.current = new window.YT.Player("player", {
          height: "360",
          width: "640",
          videoId: current,
          playerVars: { autoplay: 1, controls: 1 },
          events: {
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.ENDED) playNext();
            },
          },
        });
      }
    }
  }, [current]);

  async function search() {
    if (!query.trim()) return;
    if (API_KEY === "YOUR_YOUTUBE_API_KEY") {
      alert("Please set your YouTube Data API key in the code (API_KEY)");
      return;
    }
    const q = encodeURIComponent(query + " music video");
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${q}&key=${API_KEY}&maxResults=8`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
        alert("YouTube API error: " + data.error.message);
        return;
      }
      const items = (data.items || []).map((it) => ({
        id: it.id.videoId,
        title: it.snippet.title,
        thumb: it.snippet.thumbnails?.default?.url || "",
      }));
      setResults(items);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    }
  }

  function addToQueue(video) {
    setQueue((q) => [...q, video]);
    if (!current) {
      // auto-start if nothing playing
      setCurrent(video.id);
      setQueue((q) => q.slice(1));
    }
  }

  function playNow(video) {
    setCurrent(video.id);
  }

  function playNext() {
    setQueue((q) => {
      if (q.length === 0) {
        setCurrent(null);
        return q;
      }
      const [next, ...rest] = q;
      setCurrent(next.id);
      return rest;
    });
  }

  function removeFromQueue(index) {
    setQueue((q) => q.filter((_, i) => i !== index));
  }

  return (
    <div className="app">
      <h1>YouTube Jukebox</h1>
      <div className="controls">
        <input
          placeholder="Search artist or song..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button onClick={search}>Search</button>
      </div>

      <div className="main">
        <div className="left">
          <h2>Search Results</h2>
          <ul className="results">
            {results.map((r) => (
              <li key={r.id}>
                <img src={r.thumb} alt="" />
                <div className="meta">
                  <div className="title">{r.title}</div>
                  <div className="actions">
                    <button onClick={() => addToQueue(r)}>Add to Queue</button>
                    <button onClick={() => playNow(r)}>Play Now</button>
                  </div>
                </div>
              </li>
            ))}
            {results.length === 0 && <li className="muted">No results</li>}
          </ul>
        </div>

        <div className="center">
          <h2>Player</h2>
          <div id="player" ref={playerRef} className="player-placeholder">
            {!current && <div className="muted">No video playing</div>}
          </div>
        </div>

        <div className="right">
          <h2>Queue</h2>
          <ul className="queue">
            {queue.map((q, i) => (
              <li key={q.id}>
                <img src={q.thumb} alt="" />
                <div className="meta">
                  <div className="title">{q.title}</div>
                  <div className="actions">
                    <button onClick={() => playNow(q)}>Play</button>
                    <button onClick={() => removeFromQueue(i)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
            {queue.length === 0 && <li className="muted">Queue is empty</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
