"use client";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, UserCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 hover:bg-white rounded-xl transition">
            <ArrowLeft size={20} className="text-[var(--text)]" />
          </Link>
          <h1 className="text-xl font-bold">Privacy & Policy</h1>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[var(--primary)] rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <Shield className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Project EN-ROUTE</h2>
            <p className="text-xs text-[var(--text-secondary)]">Privacy Policy</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-[var(--text)] leading-relaxed">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-[var(--primary)]" />
              <h3 className="font-bold">Confidential Information</h3>
            </div>
            <p className="text-[var(--text-secondary)]">
              Project EN-ROUTE contains confidential and classified mapping information. This data is essential to the functionality and integrity of our delivery network and is protected under strict access controls.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-[var(--primary)]" />
              <h3 className="font-bold">Privacy Commitment</h3>
            </div>
            <p className="text-[var(--text-secondary)]">
              <strong>Hashtag Dropee</strong> respects user privacy and will <strong>not sell, disclose, or expose</strong> personal information or mapping data to any unauthorized second or third party unless required by law.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={16} className="text-[var(--primary)]" />
              <h3 className="font-bold">Data Usage</h3>
            </div>
            <p className="text-[var(--text-secondary)]">
              User information is handled securely and only used to improve delivery services and platform functionality. We do not use your data for unrelated purposes.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-[var(--primary)]" />
              <h3 className="font-bold">Core Commitment</h3>
            </div>
            <p className="text-[var(--text-secondary)]">
              Privacy and data protection remain a core commitment of the project. We continuously review and update our practices to ensure the highest standards of data security.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mt-6">
            <p className="text-sm text-emerald-800 font-medium mb-2">Questions about this policy?</p>
            <p className="text-xs text-emerald-600">
              Contact us at{" "}
              <a href="mailto:hashtagdropee@gmail.com" className="underline">hashtagdropee@gmail.com</a>{" "}
              or via{" "}
              <a href="https://wa.me/917005498122" target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)] pt-8">
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
