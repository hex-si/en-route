"use client";
import Link from "next/link";
import { MapPin, ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 hover:bg-white rounded-xl transition">
            <ArrowLeft size={20} className="text-[var(--text)]" />
          </Link>
          <h1 className="text-xl font-bold">About Us</h1>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[var(--primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <MapPin className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Project EN-ROUTE</h2>
            <p className="text-xs text-[var(--text-secondary)]">by Hashtag Dropee</p>
          </div>
        </div>

        {/* Mission */}
        <div className="space-y-4 text-sm text-[var(--text)] leading-relaxed mb-8">
          <p>
            Project EN-ROUTE is designed to improve delivery transparency and location accuracy throughout <strong>Ukhrul</strong>.
          </p>
          <p>
            Our goal is to build a smarter, more reliable, and community-driven delivery network that benefits customers, delivery partners, and local businesses.
          </p>
          <p>
            We believe better mapping leads to faster deliveries, fewer errors, and improved accessibility across the region.
          </p>
          <p>
            We encourage everyone to share this initiative with friends, family, businesses, and delivery partners so we can collectively create a better delivery ecosystem in Ukhrul.
          </p>

          {/* Commitment */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mt-6">
            <p className="text-sm text-emerald-800 italic leading-relaxed">
              &ldquo;We pledge our commitment to serving the community with transparency, reliability, and continuous improvement.&rdquo;
            </p>
            <p className="text-xs text-emerald-600 mt-3 font-medium">— Hashtag Dropee Team</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)] pt-4">
          A Hashtag Dropee Initiative — eX Holdings
        </p>

        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <Link href="/about" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition">
            About Us
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/privacy" className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition">
            Privacy & Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
