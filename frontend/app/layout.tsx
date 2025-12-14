import type { Metadata } from "next";
import "./globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "BITS Dubai RAG Assistant | University Information System",
  description: "Instant answers for BITS Pilani Dubai courses, grading policies, and academic regulations. Powered by AI.",
  keywords: ["BITS Pilani", "Dubai Campus", "RAG", "AI", "University Assistant", "Coursework"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}