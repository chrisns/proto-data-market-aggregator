import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDataDatabricks, DATE_FORMAT } from '../src/index';

describe('Databricks Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('calls the Databricks API with cacheKey containing the search term and formats results', async () => {
    const updatedAt = '1710000000000';
    const expectedDate = new Date(parseInt(updatedAt)).toLocaleString('en-GB', DATE_FORMAT).replace(',', '');

    const mockResponse = {
      listings: [
        {
          id: 'test-id',
          summary: { name: 'Test Listing', subtitle: 'Example subtitle', updated_at: updatedAt },
          detail: { description: 'Test Description' },
          provider_summary: { name: 'Test Provider', description: 'Provider Desc' }
        },
        {
          id: 'other-id',
          summary: { name: 'Other Listing', subtitle: 'Other subtitle', updated_at: updatedAt },
          detail: { description: 'Other Description' },
          provider_summary: { name: 'Other Provider', description: 'Other Desc' }
        }
      ]
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataDatabricks('Test');

    expect(fetch).toHaveBeenCalledWith(
      'https://marketplace.databricks.com/api/2.0/public-marketplace-listings',
      expect.objectContaining({
        cf: expect.objectContaining({
          cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
          cacheEverything: true,
          cacheKey: 'databricks-Test'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'test-id',
      title: 'Test Listing',
      subtitle: 'Example subtitle',
      description: 'Test Description',
      provider: {
        title: 'Test Provider',
        description: 'Provider Desc'
      },
      url: 'https://marketplace.databricks.com/details(test-id)/listing',
      source: 'Databricks',
      updated: expectedDate
    });
  });

  it('uses a distinct cacheKey for each search term', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ listings: [] })
    } as Response);

    await fetchDataDatabricks('alpha');
    await fetchDataDatabricks('beta');

    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        cf: expect.objectContaining({ cacheKey: 'databricks-alpha' })
      })
    );
    expect(vi.mocked(fetch).mock.calls[1][1]).toEqual(
      expect.objectContaining({
        cf: expect.objectContaining({ cacheKey: 'databricks-beta' })
      })
    );
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));
    await expect(fetchDataDatabricks('test')).resolves.toEqual([]);
  });

  it('handles non-200 responses gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' })
    } as Response);

    await expect(fetchDataDatabricks('test')).resolves.toEqual([]);
  });

  it('handles missing data structure gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    } as Response);

    const results = await fetchDataDatabricks('test');
    expect(results).toEqual([]);
  });
});
