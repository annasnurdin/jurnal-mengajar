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
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background antialiased min-h-screen flex flex-col font-body-md">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

