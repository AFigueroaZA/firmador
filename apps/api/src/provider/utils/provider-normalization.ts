import type { ExternalProfile } from '../types';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export const normalizeChallengeBirthDate = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return value;
  }

  const isoMatch = trimmed.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }

  return DMY_DATE_PATTERN.test(trimmed) ? trimmed : trimmed;
};

const nationalMobileDigits = (value: string | undefined) => {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (digits.length === 11 && digits.startsWith('56')) {
    return digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
};

export const normalizeChallengePhone = (value: string | undefined) =>
  nationalMobileDigits(value);

export const normalizeRaPhone = (value: string | undefined) => {
  const national = nationalMobileDigits(value);
  return national.length === 9 ? `56${national}` : national;
};

export const normalizeProfileForChallenge = (
  profile: ExternalProfile,
): ExternalProfile => ({
  ...profile,
  fechaNacimiento: normalizeChallengeBirthDate(profile.fechaNacimiento),
  telefono: normalizeChallengePhone(profile.telefono),
});

export const normalizeProfileForRa = (
  profile: ExternalProfile,
): ExternalProfile => ({
  ...profile,
  telefono: normalizeRaPhone(profile.telefono),
});
