import "./globals.css";
import { Providers } from "../src/providers/providers";
import { Outfit, DM_Sans } from "next/font/google";

const heading = Outfit({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata = { title: "Court Case Management System" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}><Providers>{children}</Providers></body>
    </html>
  );
}
