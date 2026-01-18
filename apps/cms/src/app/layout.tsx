export const metadata = {
  title: "ESLEE CMS",
  description: "Content Management System for ESLEE.io",
};

export default function RootLayout({
  children,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: React 19 type mismatch workaround
  children: any;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
