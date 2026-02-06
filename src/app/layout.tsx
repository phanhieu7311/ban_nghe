import type { Metadata } from "next";
import { Outfit, Dancing_Script } from "next/font/google";
import "./globals.css";
import CustomerLayout from "@/components/CustomerLayout";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tinh bột nghệ Xoan Linh - Tinh bột nghệ nguyên chất 100%",
  description: "Website bán hàng trực tuyến với nhiều sản phẩm chất lượng từ nghệ tươi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className={`${outfit.variable} ${dancingScript.variable} antialiased`}>
        <CustomerLayout>
          {children}
        </CustomerLayout>
      </body>
    </html>
  );
}
