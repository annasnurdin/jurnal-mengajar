import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "Jurnal Mengajar Dashboard",
  description: "Dashboard Guru & Pengajaran",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased light">
      <head>
        <link
          rel="preload"
          href="/fonts/material-symbols-outlined.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&amp;display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background antialiased min-h-screen flex flex-col font-body-md">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

