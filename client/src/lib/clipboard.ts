/**
 * Copy `text` to the clipboard via the async Clipboard API.
 *
 * Returns `true` when the write succeeds and `false` on any failure —
 * a rejected promise (permission denied, insecure context) or an
 * environment where `navigator.clipboard` is absent. Callers gate their
 * confirmation cue on the boolean rather than handling a throw, so a
 * failed copy degrades quietly instead of surfacing an exception
 * (ui.md Lobby View: the copy affordance is a convenience, never a
 * blocking path).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
