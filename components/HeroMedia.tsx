"use client";

export function HeroMedia() {
  return (
    <div className="w-full bg-white flex items-center justify-center py-10 md:py-14">
      <div className="text-center">
        <div className="w-14 h-14 bg-[var(--primary)] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-200">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">En-Route</h1>
        <p className="text-sm text-gray-500 mt-0.5">by Hashtag Dropee</p>
      </div>
    </div>
  );
}
