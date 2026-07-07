import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { AppStateProvider } from "@/lib/store";
import { DemoTeamProvider } from "@/lib/demo/team";
import { ClientsProvider } from "@/lib/demo/clients";
import { PageviewTracker } from "@/components/analytics/PageviewTracker";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreatorHub — Plan · Create · Analyze · Grow",
  description: "Premium creator operating system.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070B14",
};

const themeBootstrap = `
(function(){
  // Dark mode only — the app ships a single dark theme.
  document.documentElement.setAttribute('data-theme', 'dark');
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
          <DemoTeamProvider>
            <ClientsProvider>
              <PageviewTracker />
              <AppShell>{children}</AppShell>
            </ClientsProvider>
          </DemoTeamProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
