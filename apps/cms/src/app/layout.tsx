export const metadata = {
  title: "Payload CMS for eslee.io",
  description: "Payload CMS for eslee.io",
};

export default function RootLayout({
  children,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: React 19 type mismatch workaround
  children: any;
}) {
  return <>{children}</>;
}
