import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bizeto PSAK",
  description: "Accounting, clearly understood.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  icons: { icon: "/brand/favicon.svg" },
  openGraph: {
    title: "Bizeto PSAK",
    description: "Evidence-first accounting workspace.",
    images: ["/brand/og-image.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
