import type { Metadata } from "next";
import { Inter, Kalam, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: ["400", "700"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "all41", template: "%s · all41" },
  description: "You describe the job. all41 optimizes your context, picks the right model, executes the task, and tracks the cost.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${kalam.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
