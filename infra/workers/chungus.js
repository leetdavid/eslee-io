// Forwards chungus.eslee.io to the Cyrus agent on the Mac mini, published with Tailscale Funnel.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "mac.li-tone.ts.net";
    url.port = "8443";
    return fetch(new Request(url, request));
  },
};
