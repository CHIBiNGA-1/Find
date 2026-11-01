import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/index.css";
import "@fontsource/newsreader/500.css";
import { ServiceWorkerRegistration } from "@/components/sw-registration";
import "./globals.css";


export const metadata: Metadata = {
  title: { default: "f!nd", template: "%s · f!nd" },
  description: "Buy, sell and find things within your university community.",
  applicationName: "f!nd",
  appleWebApp: { capable: true, title: "f!nd", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f6b4f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

