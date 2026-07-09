import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm font-medium text-[var(--text)]">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border ${error ? "border-[var(--error)]" : "border-[var(--border)]"} bg-white text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--text-secondary)]">{hint}</p>}
        {error && <p className="text-xs text-[var(--error)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
