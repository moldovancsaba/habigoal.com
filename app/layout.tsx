import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KIDEX Assessment",
  description: "Bio-psycho-social assessment app for KIDEX child examinations.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
