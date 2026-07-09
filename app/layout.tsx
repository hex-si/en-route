import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "En-Route | Register Your Household — Ukhrul",
  description: "Register your household address for Hashtag Dropee delivery. No standardized street addresses? We fix that.",
  icons: {
    icon: "/hero.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
