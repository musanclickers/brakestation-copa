'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const VIDEO_DESKTOP = 'https://assets.brakestation.com.mx/videos/intro-goleadora.mp4';
const VIDEO_MOBILE = 'https://assets.brakestation.com.mx/videos/intro-goleadora-mobile.mp4';

export function IntroSplash({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    setVideoSrc(isMobile ? VIDEO_MOBILE : VIDEO_DESKTOP);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setCanSkip(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    v.play().catch(() => router.push(redirectTo));
  }, [videoSrc, redirectTo, router]);

  if (!videoSrc) {
    return <div className="fixed inset-0 bg-black" />;
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        onEnded={() => router.push(redirectTo)}
        onError={() => router.push(redirectTo)}
        key={videoSrc}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {canSkip && (
        <button
          onClick={() => router.push(redirectTo)}
          className="absolute top-6 right-6 z-10 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Omitir intro"
        >
          Omitir →
        </button>
      )}
    </div>
  );
}
