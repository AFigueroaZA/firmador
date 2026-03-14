import { normalizeSignOptions } from './sign-options';

describe('normalizeSignOptions', () => {
  it('returns invisible signature config when visible is false', () => {
    expect(normalizeSignOptions({ visible: 'false' })).toEqual({
      visible: false,
    });
  });

  it('normalizes visible signature coordinates', () => {
    expect(
      normalizeSignOptions({
        visible: 'true',
        page: '1',
        x: '120',
        y: '80',
        width: '160',
        height: '64',
      }),
    ).toEqual({
      visible: true,
      page: 1,
      x: 120,
      y: 80,
      width: 160,
      height: 64,
      imageFileName: undefined,
    });
  });
});
