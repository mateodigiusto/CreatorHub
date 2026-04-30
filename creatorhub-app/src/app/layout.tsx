import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { AppStateProvider } from "@/lib/store";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreatorHub — Plan · Create · Analyze · Grow",
  description: "Premium creator operating system.",
};

const themeBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('creatorhub-theme');
    if (t !== 'dark' && t !== 'light') t = 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  try {
    var p = localStorage.getItem('creatorhub-onboarded');
    document.documentElement.setAttribute('data-onboarded', p === 'true' ? 'true' : 'false');
  } catch(e) {
    document.documentElement.setAttribute('data-onboarded', 'false');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full">
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
