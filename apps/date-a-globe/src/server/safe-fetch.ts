import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const USER_AGENT = "DateAGlobe/1.0 (+https://dateaglobe.eslee.io)";
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;

// Addresses a user-supplied link must never reach: loopback, private, link-local, shared and reserved ranges.
const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  blocked.addSubnet(net, bits, "ipv6");

export const isPublicAddress = (address: string) => {
  const family = isIP(address);
  if (family === 0) return false;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return !blocked.check(mapped, "ipv4");
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
};

export class FetchError extends Error {}

// The check runs when the socket connects, so a name can't resolve to a public address first and a private one later.
function guardedLookup(
  hostname: string,
  options: { all?: boolean },
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const safe = addresses.filter((a) => isPublicAddress(a.address));
    if (safe.length === 0 || safe.length !== addresses.length)
      return callback(new FetchError("That link points at a private address"), []);
    if (options.all) return callback(null, safe);
    const first = safe[0] as LookupAddress;
    callback(null, first.address, first.family);
  });
}

/** Fetches a web page's text for the source check. Only http(s), public addresses, small HTML or text. */
export async function fetchPage(
  url: string,
  redirects = 0,
): Promise<{ url: string; text: string }> {
  const target = new URL(url);
  if (target.protocol !== "https:" && target.protocol !== "http:")
    throw new FetchError("Only web links can be checked");
  if (target.username || target.password)
    throw new FetchError("Links with passwords can't be checked");
  if (
    isIP(target.hostname.replace(/^\[|\]$/g, "")) &&
    !isPublicAddress(target.hostname.replace(/^\[|\]$/g, ""))
  )
    throw new FetchError("That link points at a private address");

  const get = target.protocol === "https:" ? https.get : http.get;
  return new Promise((resolve, reject) => {
    const req = get(
      target,
      {
        headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain;q=0.9" },
        lookup: guardedLookup as never,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= MAX_REDIRECTS) return reject(new FetchError("Too many redirects"));
          return fetchPage(new URL(res.headers.location, target).toString(), redirects + 1).then(
            resolve,
            reject,
          );
        }
        if (status !== 200) {
          res.resume();
          return reject(new FetchError(`The page answered ${status}`));
        }
        const type = String(res.headers["content-type"] ?? "");
        if (!/text\/html|text\/plain|application\/xhtml/.test(type)) {
          res.resume();
          return reject(new FetchError("That link isn't a web page"));
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            // Long pages are still useful; keep what arrived.
            resolve({ url: target.toString(), text: Buffer.concat(chunks).toString("utf8") });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({ url: target.toString(), text: Buffer.concat(chunks).toString("utf8") }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("The page took too long")));
    req.on("error", (err) =>
      reject(err instanceof FetchError ? err : new FetchError("The page didn't open")),
    );
  });
}

/** Visible text of an HTML page, without scripts, styles or tags. */
export function pageText(html: string) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

export { USER_AGENT };
