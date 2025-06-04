import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, beforeEach, expect, vi, Mock } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Databricks Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('uses search-specific cache key for Databricks requests', async () => {
    const searchTerm = 'example';
    const databricksResponse = { listings: [] };
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (new URL(url).hostname === 'marketplace.databricks.com') {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(databricksResponse)
        } as Response);
      }
      return Promise.reject(new Error('skip'));
    });

    const request = new IncomingRequest(`http://example.com?search=${encodeURIComponent(searchTerm)}`);
    const ctx = createExecutionContext();
    await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://marketplace.databricks.com/api/2.0/public-marketplace-listings',
      expect.objectContaining({
        cf: {
          cacheTtlByStatus: { '200-299': 1209600, 404: 1, '500-599': 0 },
          cacheEverything: true,
          cacheKey: `databricks-${searchTerm}`
        }
      })
    );
  });
});
