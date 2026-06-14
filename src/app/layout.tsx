import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/components/locale-provider";
import { ExperienceProvider } from "@/components/experience-provider";
import { getOptionalViewer } from "@/lib/auth";
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
  title: {
    default: "Lingora - Học tiếng Anh cùng AI",
    template: "%s | Lingora",
  },
  description:
    "Gia sư tiếng Anh AI cho người Việt: tài liệu, từ vựng, phát âm, viết và dịch thuật.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getOptionalViewer();
  return (
    <html
      lang={viewer?.locale ?? "vi"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <TooltipProvider>
          <LocaleProvider initialLocale={viewer?.locale ?? "vi"}>
            <ExperienceProvider initialPreferences={viewer?.preferences}>
              <AppShell viewer={viewer}>{children}</AppShell>
              <Toaster richColors position="top-right" />
            </ExperienceProvider>
          </LocaleProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
