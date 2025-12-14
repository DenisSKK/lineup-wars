import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lineup Wars - Compare Festival Lineups",
  description: "Rate bands from different festivals and compare which festival has the best lineup with your friends",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
