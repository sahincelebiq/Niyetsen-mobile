/**
 * Auth splash kilidi — OAuth / deep link hold oturumu ezmesin, sonsuz
 * spinner da bırakmasın.
 */

export const AUTH_HOLD_MAX_MS = 12_000;

export function isAuthUiLocked(opts: {
  bootLoading: boolean;
  oauthHold: boolean;
  deepLinkHold: boolean;
  hasSession: boolean;
  holdElapsedMs: number;
}): boolean {
  if (opts.hasSession) return false;
  if (opts.bootLoading) return true;
  if (!opts.oauthHold && !opts.deepLinkHold) return false;
  if (opts.holdElapsedMs >= AUTH_HOLD_MAX_MS) return false;
  return true;
}
