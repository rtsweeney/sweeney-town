import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sweeney Town — Free Web Apps by Ryan Sweeney",
  description:
    "NFL Elo predictions, a standard-drink calculator, a carton packing optimizer and more — free web apps by Ryan Sweeney that run entirely in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variable goes on <html>: globals.css builds --font-sans from
    // --font-inter on :root, and a variable only resolves where it's defined.
    // On <body> it was undefined at :root, so every page fell back to Times.
    <html lang="en" className={inter.variable}>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
