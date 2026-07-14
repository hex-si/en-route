"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_data: string | null;
  video_data: string | null;
  link_url: string;
}

export function AdBanner({ position }: { position: "landing" | "dashboard" }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`/api/ads?position=${position}`);
      const data = await res.json();
      setAds(data.ads || []);
    } catch {}
  }, [position]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAds, 300000);
    return () => clearInterval(interval);
  }, [fetchAds]);

  // Auto-scroll every 5 seconds (pauses during video playback)
  useEffect(() => {
    if (ads.length <= 1 || isPaused || videoPlaying) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % ads.length);
      setExpanded(false);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length, isPaused, videoPlaying]);

  const prev = () => { setCurrent((c) => (c - 1 + ads.length) % ads.length); setExpanded(false); };
  const next = () => { setCurrent((c) => (c + 1) % ads.length); setExpanded(false); };

  const toggleVideo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  // Reset state when slide changes
  useEffect(() => {
    setVideoPlaying(false);
    setExpanded(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [current]);

  if (ads.length === 0) return null;

  const ad = ads[current];
  const hasVideo = !!ad.video_data;
  const hasLongDesc = ad.description && ad.description.length > 60;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-md transition active:scale-[0.98]"
      >
        {/* Media */}
        <div className="relative">
          {ad.video_data ? (
            <>
              <video
                ref={videoRef}
                src={ad.video_data}
                className="w-full h-56 object-cover"
                muted
                loop
                playsInline
                preload="none"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              />
              <button
                onClick={toggleVideo}
                className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
              >
                {videoPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </>
          ) : ad.image_data ? (
            <img src={ad.image_data} alt={ad.title} loading="lazy" decoding="async" className="w-full h-52 object-cover" />
          ) : ad.image_url ? (
            <img src={ad.image_url} alt={ad.title} loading="lazy" decoding="async" className="w-full h-52 object-cover" />
          ) : null}
        </div>

        {/* Text content */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{ad.title}</p>
              {ad.description && (
                <p className={`text-xs text-[var(--text-secondary)] mt-1 ${expanded ? "" : "line-clamp-2"}`}>
                  {ad.description}
                </p>
              )}
              {hasLongDesc && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
                  className="text-xs text-[var(--primary)] mt-1 hover:underline"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
            <ExternalLink size={14} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
          </div>
        </div>
      </a>

      {/* Navigation arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      {ads.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setExpanded(false); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-5 bg-[var(--primary)]" : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
