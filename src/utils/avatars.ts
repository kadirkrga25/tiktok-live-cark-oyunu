/** Neutral placeholder used only when TikTok does not expose a profile image. */
const PLACEHOLDER_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#334155"/><circle cx="50" cy="36" r="18" fill="#94a3b8"/><path d="M17 91c2-21 15-32 33-32s31 11 33 32" fill="#94a3b8"/></svg>'
)}`;

/** Return a neutral placeholder instead of displaying a fake/random person's photo. */
export function getFallbackAvatar(_username: string): string {
  return PLACEHOLDER_AVATAR;
}
