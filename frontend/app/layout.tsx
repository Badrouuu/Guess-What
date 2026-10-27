import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VectorWord — Le jeu des analogies IA",
  description:
    "Découvre l'IA à travers le jeu ! Complète les analogies Word2Vec, trouve les 10 mots les plus proches, gagne des points. Défi quotidien, style Ma Famille en Or.",
  openGraph: {
    title: "VectorWord",
    description: "Le jeu des analogies IA · Nouveau défi chaque jour",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0A0A0A]`}
      >
        {children}
      </body>
    </html>
  );
}
