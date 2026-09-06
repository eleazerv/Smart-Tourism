import type { Metadata } from "next";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const siteName = "Jelantara";
const title = "Jelantara — Explore the Wonders of Indonesia";
const description =
  "Lihat prediksi kepadatan destinasi wisata Indonesia, temukan waktu kunjungan paling sepi, dan bantu cegah overtourism. Data BPS, BMKG, dan pengelola destinasi.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  applicationName: siteName,
  keywords: [
    "kepadatan wisata",
    "prediksi pengunjung",
    "overtourism",
    "pariwisata berkelanjutan",
    "waktu terbaik berkunjung",
    "kuota pengunjung",
    "destinasi Indonesia",
  ],
  openGraph: {
    type: "website",
    siteName,
    locale: "id_ID",
    url: "/",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

const sans = Geist({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
