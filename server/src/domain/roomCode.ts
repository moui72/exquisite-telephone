/**
 * Short, unambiguous room codes (datamodel.md Normalization Rules): read
 * aloud or typed by players, so visually/aurally similar characters
 * (0/O, 1/I/L, etc.) are excluded.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
