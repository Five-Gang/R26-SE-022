import "./globals.css";

export const metadata = {
  title: "EmotiSense — Affect & Attention-Aware Emotion Detection",
  description: "Lightweight privacy-preserving emotion detection system for student study sessions using facial landmark detection and eye behavior analysis.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
