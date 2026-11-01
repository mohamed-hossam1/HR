import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "بوابة قطاع الكباري — المقاولون العرب",
  title: {
    default: "المقاولون العرب | بوابة قطاع الكباري",
    template: "%s | المقاولون العرب",
  },
  description:
    "البوابة الإلكترونية لخدمات العاملين بقطاع الكباري والإنشاءات التخصصية بشركة المقاولون العرب",
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "المقاولون العرب — قطاع الكباري والإنشاءات التخصصية",
    title: "المقاولون العرب | بوابة قطاع الكباري",
    description:
      "البوابة الإلكترونية لخدمات العاملين بقطاع الكباري والإنشاءات التخصصية بشركة المقاولون العرب",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
