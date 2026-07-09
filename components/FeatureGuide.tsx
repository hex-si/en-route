"use client";
import { useState, useEffect } from "react";
import { X, MapPin, Camera, Users, Trophy, ChevronRight } from "lucide-react";

interface Step {
  title: string;
  desc: string;
  icon: "pin" | "photo" | "member" | "refer";
}

const guides: Record<string, { title: string; steps: Step[] }> = {
  pin: {
    title: "Google Maps Pin",
    steps: [
      { title: "Open Registration", desc: "Tap \"Register Your Household\" on the home page", icon: "pin" },
      { title: "Enter Your Details", desc: "Fill in your name and phone number", icon: "pin" },
      { title: "Paste Maps Link", desc: "Open Google Maps → long-press on your house → tap \"Copy link\"", icon: "pin" },
      { title: "Paste & Submit", desc: "Paste the link in the Google Maps Link field and submit", icon: "pin" },
    ],
  },
  photo: {
    title: "House Photos",
    steps: [
      { title: "After Registration", desc: "Go to your Dashboard → House Photos section", icon: "photo" },
      { title: "Tap to Add", desc: "Tap the + button to select photos from your gallery", icon: "photo" },
      { title: "Upload Up to 4", desc: "Front of house, gate, nearby landmark, road view", icon: "photo" },
      { title: "Save", desc: "Tap \"Save Photos\" — locked after save for privacy", icon: "photo" },
    ],
  },
  member: {
    title: "Household Members",
    steps: [
      { title: "Go to Dashboard", desc: "Scroll to the Household Members section", icon: "member" },
      { title: "Add Members", desc: "Enter name and phone for each person at your address", icon: "member" },
      { title: "Unlimited", desc: "Add as many members as needed — no limit", icon: "member" },
      { title: "Earn Points", desc: "Each household gets +3 points for having members", icon: "member" },
    ],
  },
  refer: {
    title: "Earn & Refer",
    steps: [
      { title: "Your Referral Link", desc: "Found on your Dashboard — unique to you", icon: "refer" },
      { title: "Share It", desc: "Send to friends and family in Ukhrul", icon: "refer" },
      { title: "Earn +10 Points", desc: "Each person who registers with your link earns you 10 points", icon: "refer" },
      { title: "Redeem Later", desc: "Points convert to rewards when Dropee launches", icon: "refer" },
    ],
  },
};

function StepIcon({ type, delay }: { type: string; delay: number }) {
  const icons = {
    pin: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-bounce" style={{ animationDelay: `${delay}ms` }}>
        <circle cx="24" cy="20" r="8" fill="#10b981" opacity="0.2" />
        <path d="M24 4C17.4 4 12 9.4 12 16c0 9 12 24 12 24s12-15 12-24c0-6.6-5.4-12-12-12z" fill="#10b981" />
        <circle cx="24" cy="16" r="4" fill="white" />
      </svg>
    ),
    photo: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-pulse" style={{ animationDelay: `${delay}ms` }}>
        <rect x="6" y="10" width="36" height="28" rx="4" fill="#10b981" opacity="0.2" />
        <rect x="8" y="12" width="32" height="24" rx="3" stroke="#10b981" strokeWidth="2" fill="white" />
        <circle cx="18" cy="22" r="3" fill="#10b981" />
        <path d="M8 32l10-8 6 5 8-6 8 6v4H8z" fill="#10b981" opacity="0.6" />
      </svg>
    ),
    member: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-bounce" style={{ animationDelay: `${delay}ms` }}>
        <circle cx="24" cy="16" r="8" fill="#10b981" opacity="0.3" />
        <circle cx="24" cy="16" r="5" fill="#10b981" />
        <path d="M12 38c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="#10b981" opacity="0.5" />
        <circle cx="38" cy="18" r="4" fill="#10b981" opacity="0.4" />
        <circle cx="10" cy="18" r="4" fill="#10b981" opacity="0.4" />
      </svg>
    ),
    refer: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="animate-bounce" style={{ animationDelay: `${delay}ms` }}>
        <path d="M24 4l6 12h14l-11 8 4 14-13-9-13 9 4-14L4 16h14z" fill="#10b981" opacity="0.3" />
        <path d="M24 8l4 8h10l-8 6 3 10-9-7-9 7 3-10-8-6h10z" fill="#10b981" />
      </svg>
    ),
  };
  return <>{icons[type as keyof typeof icons]}</>;
}

export function FeatureGuide() {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const guide = activeGuide ? guides[activeGuide] : null;

  useEffect(() => {
    if (!guide) return;
    setCurrentStep(0);
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [activeGuide]);

  const nextStep = () => {
    if (!guide) return;
    if (currentStep < guide.steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setAnimating(false);
      }, 200);
    } else {
      setActiveGuide(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!guide) return null;

  const step = guide.steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setActiveGuide(null)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-bold text-base">{guide.title}</h3>
          <button onClick={() => setActiveGuide(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-5 pb-4">
          {guide.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-6 bg-[var(--primary)]" : i < currentStep ? "w-1.5 bg-[var(--primary)]/40" : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step content with animation */}
        <div className={`px-5 pb-6 transition-all duration-300 ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          <div className="flex flex-col items-center text-center mb-5">
            <div className="mb-4">
              <StepIcon type={step.icon} delay={0} />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Step {currentStep + 1} of {guide.steps.length}</p>
            <h4 className="font-semibold text-base mb-1">{step.title}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{step.desc}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-1"
            >
              {currentStep < guide.steps.length - 1 ? (
                <>Next <ChevronRight size={16} /></>
              ) : (
                "Got it!"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureGuideTrigger({ guideKey, children }: { guideKey: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <FeatureGuideContent guideKey={guideKey} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

function FeatureGuideContent({ guideKey, onClose }: { guideKey: string; onClose: () => void }) {
  const guide = guides[guideKey];
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setCurrentStep(0);
  }, [guideKey]);

  if (!guide) return null;

  const step = guide.steps[currentStep];

  const nextStep = () => {
    if (currentStep < guide.steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setAnimating(false);
      }, 200);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  return (
    <div
      className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="font-bold text-base">{guide.title}</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition">
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 px-5 pb-4">
        {guide.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep ? "w-6 bg-[var(--primary)]" : i < currentStep ? "w-1.5 bg-[var(--primary)]/40" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className={`px-5 pb-6 transition-all duration-300 ${animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-4">
            <StepIcon type={step.icon} delay={0} />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-1">Step {currentStep + 1} of {guide.steps.length}</p>
          <h4 className="font-semibold text-base mb-1">{step.title}</h4>
          <p className="text-sm text-[var(--text-secondary)]">{step.desc}</p>
        </div>

        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-1"
          >
            {currentStep < guide.steps.length - 1 ? (
              <>Next <ChevronRight size={16} /></>
            ) : (
              "Got it!"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
