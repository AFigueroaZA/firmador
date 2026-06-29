import {
  normalizeChallengeBirthDate,
  normalizeChallengePhone,
  normalizeRaPhone,
} from './provider-normalization';

describe('provider normalization', () => {
  it('formats ISO birth dates for the challenge API', () => {
    expect(normalizeChallengeBirthDate('1990-01-10')).toBe('10-01-1990');
  });

  it('keeps provider-formatted birth dates for the challenge API', () => {
    expect(normalizeChallengeBirthDate('10-01-1990')).toBe('10-01-1990');
  });

  it('formats Chilean mobile numbers for challenge and RA calls', () => {
    expect(normalizeChallengePhone('+56 9 1234 5678')).toBe('912345678');
    expect(normalizeRaPhone('+56 9 1234 5678')).toBe('56912345678');
  });

  it('adds the country code only for RA calls when the phone is national', () => {
    expect(normalizeChallengePhone('912345678')).toBe('912345678');
    expect(normalizeRaPhone('912345678')).toBe('56912345678');
  });
});
