/** Doğum tarihi: kullanıcı GG.AA.YYYY görür; backend YYYY-MM-DD (ISO) bekler. */

const DISPLAY_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function birthDateDisplayFromIso(iso: string | null | undefined): string {
  const trimmed = iso?.trim() ?? '';
  const isoMatch = ISO_PATTERN.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }
  const displayMatch = DISPLAY_PATTERN.exec(trimmed);
  if (displayMatch) return trimmed;
  return '';
}

export function birthDateIsoFromDisplay(display: string): string | null {
  const match = DISPLAY_PATTERN.exec(display.trim());
  if (!match) return null;
  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  if (parsed > new Date()) return null;
  return `${yearStr}-${monthStr}-${dayStr}`;
}

export function isValidBirthDateDisplay(display: string): boolean {
  return birthDateIsoFromDisplay(display) !== null;
}

/** ISO YYYY-MM-DD için yaş kontrolü (kayıt ve profil 18+ kapısı). */
export function isAtLeastYearsOld(
  iso: string,
  years: number,
  now = new Date(),
): boolean {
  const match = ISO_PATTERN.exec(iso.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age -= 1;
  }
  return age >= years;
}
