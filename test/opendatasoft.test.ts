import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDataOpenDataSoft, DATE_FORMAT } from '../src/index';

describe('OpenDataSoft Integration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('constructs the correct API URL', async () => {
    const testDate = '2024-03-20T12:00:00Z';
    const expectedDate = new Date(testDate).toLocaleString('en-GB', DATE_FORMAT).replace(',', '');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: () => Promise.resolve({
        total_count: 1,
        results: [{
          dataset_id: 'test-dataset',
          dataset_uid: 'test-uid',
          metas: {
            default: {
              title: 'Test Dataset',
              description: 'Test Description',
              publisher: 'Test Publisher',
              modified: testDate,
              theme: ['Environment'],
              keyword: ['test', 'data']
            }
          }
        }]
      })
    });

    globalThis.fetch = mockFetch;

    const results = await fetchDataOpenDataSoft('test query');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets?where=%22test%20query%22&limit=20&offset=0&lang=en&timezone=UTC&include_links=false&include_app_metas=false',
      expect.objectContaining({
        cf: expect.objectContaining({
          cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
          cacheEverything: true,
          cacheKey: 'opendatasoft-test query'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'test-uid',
      title: 'Test Dataset',
      description: 'Test Description',
      subtitle: 'Environment, test, data',
      provider: {
        title: 'Test Publisher',
        description: 'OpenDataSoft Data Platform'
      },
      url: 'https://data.opendatasoft.com/explore/dataset/test-dataset',
      source: 'OpenDataSoft',
      updated: expectedDate
    });
  });

  it('handles empty search results gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: () => Promise.resolve({
        total_count: 0,
        results: []
      })
    });

    globalThis.fetch = mockFetch;

    const results = await fetchDataOpenDataSoft('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));
    globalThis.fetch = mockFetch;

    await expect(fetchDataOpenDataSoft('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: () => 'application/json'
      }
    });

    globalThis.fetch = mockFetch;

    await expect(fetchDataOpenDataSoft('test')).rejects.toThrow('OpenDataSoft API error: Status 500');
  });

  it('handles missing data structure gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: () => Promise.resolve({})
    });

    globalThis.fetch = mockFetch;

    await expect(fetchDataOpenDataSoft('test')).rejects.toThrow('OpenDataSoft API response missing expected data structure');
  });
}); 