import { SupabaseSetupService } from './supabase-setup.service';

describe('SupabaseSetupService', () => {
  const createHarness = (bucket: object | null, createError: object | null) => {
    const storage = {
      getBucket: jest.fn().mockResolvedValue({ data: bucket }),
      createBucket: jest.fn().mockResolvedValue({ error: createError }),
    };
    const service = new SupabaseSetupService({
      getAdminClient: () => ({ storage }),
    } as never);
    return { service, storage };
  };

  it('does not recreate an existing storage bucket', async () => {
    const { service, storage } = createHarness({ id: 'documents' }, null);

    await service.ensureStorageBucket();

    expect(storage.createBucket).not.toHaveBeenCalled();
  });

  it('creates a missing private storage bucket', async () => {
    const { service, storage } = createHarness(null, null);

    await service.ensureStorageBucket();

    expect(storage.createBucket).toHaveBeenCalledWith('documents', {
      public: false,
    });
  });

  it('surfaces unexpected storage setup failures', async () => {
    const { service } = createHarness(null, { message: 'service unavailable' });

    await expect(service.ensureStorageBucket()).rejects.toThrow(
      'Unable to create Supabase bucket: service unavailable',
    );
  });
});
