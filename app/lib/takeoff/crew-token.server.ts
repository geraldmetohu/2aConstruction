import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Personal check-in links for workers: only a hash of the token is stored. */
export const newCrewToken = () => randomBytes(24).toString("base64url");
export const hashCrewToken = (token: string) => createHash("sha256").update(`crew:${token}`).digest("hex");
