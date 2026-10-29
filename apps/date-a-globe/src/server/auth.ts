import "server-only";
// Pick this app's GitHub OAuth pair before the shared auth package reads it.
import "@/server/github-env";

export { auth } from "@eslee/auth";
