export const PHONE_HINT = "Enter the phone number with its country code, like +6281234567890.";

const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * Turns the way people write phone numbers into E.164 (+6281234567890), the
 * form the database stores. A number without a country code is read as
 * Indonesian: a leading 0 is replaced by 62, and a bare 8xx number, which is
 * what Excel leaves after it drops the leading zero, gets 62 in front.
 * Returns null when the number cannot be read with confidence.
 */
export function normalizePhone(raw: string, defaultCountryCode = "62"): string | null {
  const text = raw.trim();
  let digits = text.replace(/\D/g, "");
  if (!digits) return null;

  if (text.startsWith("+")) {
    // +62 (0)812 ...: the (0) is not part of the number
    if (digits.startsWith(`${defaultCountryCode}0`)) digits = defaultCountryCode + digits.slice(defaultCountryCode.length + 1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.startsWith(defaultCountryCode)) {
    // already written with the country code, just without the plus
  } else if (defaultCountryCode === "62" && digits.startsWith("8")) {
    digits = `62${digits}`;
  } else {
    return null;
  }

  const phone = `+${digits}`;
  return E164.test(phone) ? phone : null;
}
