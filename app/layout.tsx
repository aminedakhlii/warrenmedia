import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warren Media Streaming",
  description: "Cinema-first public streaming platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

