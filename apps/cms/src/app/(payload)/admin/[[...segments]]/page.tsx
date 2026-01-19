/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { importMap } from "../importMap";

type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = ({ params, searchParams }: Args) =>
  // biome-ignore lint/suspicious/noExplicitAny: Payload version mismatch workaround
  generatePageMetadata({ config: config as any, params, searchParams });

const Page = ({ params, searchParams }: Args) =>
  // biome-ignore lint/suspicious/noExplicitAny: Payload version mismatch workaround
  RootPage({ config: config as any, params, searchParams, importMap });

export default Page;
