/**
 * Caps on everything a player can type, in one place so the input that enforces
 * them and the code that validates them can never drift apart.
 *
 * These are enforced as `maxlength` on the field itself: the browser refuses
 * the extra keystrokes outright, which is the only feedback that arrives while
 * the player is still typing. Rejecting the value afterwards leaves them
 * pressing a button that silently does nothing.
 */
export const LIMITS = {
  // Matches the server's isValidNickname().
  nickname: 15,
  // Matches the length SendMessage() refuses to broadcast.
  message: 50,
  // A room hash is a v4 uuid: 36 characters, exactly.
  roomHash: 36,
};
