// The shared auth package reads GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. This app has one GitHub OAuth app
// for production and one for localhost, so pick the pair before the auth package loads. Import this first.
const pair = process.env.VERCEL_ENV === "production" ? "PROD" : "DEV";
process.env.GITHUB_CLIENT_ID ??= process.env[`GITHUB_CLIENT_ID_${pair}`];
process.env.GITHUB_CLIENT_SECRET ??= process.env[`GITHUB_CLIENT_SECRET_${pair}`];

/** Previews have no OAuth app of their own, so nobody signs in there. */
export const signInEnabled = process.env.VERCEL_ENV !== "preview" && !!process.env.GITHUB_CLIENT_ID;
