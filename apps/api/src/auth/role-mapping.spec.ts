import { mapDatabaseRoleToAuthRole } from './role-mapping';

describe('mapDatabaseRoleToAuthRole', () => {
  it.each([
    ['ADMIN', 'admin'],
    ['SIGNER', 'operator'],
    ['UNKNOWN', 'operator'],
    [null, 'operator'],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(mapDatabaseRoleToAuthRole(input)).toBe(expected);
  });
});
