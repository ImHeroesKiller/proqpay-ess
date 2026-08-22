import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProQPay — ESS Portal",
  description: "Portal Employee Self-Service ProQPay: lacak progres payroll, unduh slip gaji, dan ajukan Advance Salary.",
  icons: { icon: "/brand/proqpay-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
