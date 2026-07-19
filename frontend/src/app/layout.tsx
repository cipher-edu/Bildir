import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/ui/QueryProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Bildir — Navoiy davlat universiteti · Komplayens nazorat",
  description:
    "Bildir — NDU Korrupsiyaga qarshi kurash «Komplayens nazorat» tizimini boshqarish bo'limi platformasi: so'rovnomalar, murojaat, ochiqlik va shaffoflik.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <I18nProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
