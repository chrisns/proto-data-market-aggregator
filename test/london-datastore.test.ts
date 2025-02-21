import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDataLondonDatastore, DATE_FORMAT } from '../src/index';

describe('London Datastore Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('constructs the correct API URL and formats response properly', async () => {
    const mockDataset = {
      id: 'test-dataset',
      title: 'Test Dataset',
      notes: 'Test Description',
      license_title: 'Open Government License',
      organization: {
        title: 'Test Organization',
        description: 'Test Org Description'
      },
      metadata_modified: '2024-01-01T12:00:00Z',
      resources: [
        {
          url: 'https://example.com/dataset'
        }
      ]
    };

    const mockResponse = {
      success: true,
      result: {
        results: [mockDataset]
      }
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataLondonDatastore('test');

    expect(fetch).toHaveBeenCalledWith(
      'https://data.london.gov.uk/api/action/package_search?q=test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json'
        }),
        cf: expect.objectContaining({
          cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
          cacheEverything: true,
          cacheKey: 'london-datastore-test'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: mockDataset.id,
      title: mockDataset.title,
      description: mockDataset.notes,
      subtitle: mockDataset.license_title,
      provider: {
        title: mockDataset.organization.title,
        description: mockDataset.organization.description
      },
      url: mockDataset.resources[0].url,
      source: 'London Datastore',
      updated: new Date(mockDataset.metadata_modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
    });
  });

  it('handles empty search results gracefully', async () => {
    const mockResponse = {
      success: true,
      result: {
        results: []
      }
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataLondonDatastore('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));
    await expect(fetchDataLondonDatastore('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);

    await expect(fetchDataLondonDatastore('test')).rejects.toThrow('London Datastore API returned 500');
  });

  it('handles invalid response format gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    } as Response);

    await expect(fetchDataLondonDatastore('test')).rejects.toThrow('Invalid response format from London Datastore API');
  });
}); 