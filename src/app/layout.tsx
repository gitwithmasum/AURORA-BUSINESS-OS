import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "AURORA BUSINESS OS",
  description:
    "Futuristic Glassmorphism Business Management & Luxury Perfume Import ERP Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="midnight-blue" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
