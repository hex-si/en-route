import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  metadataBase: new URL("https://discoverukhrul.site"),
  title: "En-Route | Smart Household Registration — Ukhrul",
  description: "Register your household once. Get accurate deliveries forever. En-Route is Ukhrul's smart household address registration system.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "En-Route | Smart Household Registration",
    description: "Helping every home in Ukhrul get found. Register your household once. Get accurate deliveries forever.",
    siteName: "En-Route",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "En-Route — Smart Household Registration for Ukhrul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "En-Route | Smart Household Registration",
    description: "Helping every home in Ukhrul get found. Register your household once. Get accurate deliveries forever.",
    images: ["/og-image.svg"],
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
