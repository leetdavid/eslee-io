// Forwards chungus.eslee.io to the Cyrus agent on the Mac mini, published with Tailscale Funnel.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "mac.li-tone.ts.net";
    url.port = "8443";

    // A forwarded in-zone Host header becomes the TLS SNI, and Funnel drops handshakes for
    // hostnames it doesn't serve. Without it, Host and SNI come from the URL.
    const headers = new Headers(request.headers);
    headers.delete("host");

    return fetch(url, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
