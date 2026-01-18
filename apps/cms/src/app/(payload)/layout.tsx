/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout } from "@payloadcms/next/layouts"; // Import RootLayout from layouts
import { importMap } from "~/importMap";

import "./custom.css";

type Args = {
  // biome-ignore lint/suspicious/noExplicitAny: React 19 type mismatch workaround
  children: any;
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap}>
    {children}
  </RootLayout>
);

export default Layout;
