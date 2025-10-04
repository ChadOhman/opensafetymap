import { fetchJSON } from "./api.js";

// Example: check session
export async function getCurrentUser() {
  try {
    return await fetchJSON("/api/auth/session.php");
  } catch {
    return null;
  }
}
