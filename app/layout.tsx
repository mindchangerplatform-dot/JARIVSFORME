import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVISFORME — AI JEE Mentor",
  description: "Your personal AI mentor for JEE preparation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}