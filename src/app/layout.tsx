import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { DemoAppProvider } from "@/features/records/demo-app-provider";
import { appConfig } from "@/lib/app-config";

export const metadata: Metadata = {
  title: appConfig.productName,
  description: `${appConfig.productDescription} · Simple para cargar. Potente para consultar.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <DemoAppProvider>
          <AppShell>{children}</AppShell>
        </DemoAppProvider>
      </body>
    </html>
  );
}
