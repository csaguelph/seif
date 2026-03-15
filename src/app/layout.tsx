import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Navbar } from "~/components/layout/navbar";
import { Footer } from "~/components/layout/footer";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "SEIF",
  description: "Secure, transparent, and verifiable elections",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="flex min-h-screen flex-col">
        <TRPCReactProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
