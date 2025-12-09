import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lineup Wars - Compare Festival Lineups",
  description: "Rate bands from different festivals and compare which festival has the best lineup with your friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
