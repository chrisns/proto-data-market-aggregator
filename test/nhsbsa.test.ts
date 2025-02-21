import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDataNHSBSA, DATE_FORMAT } from '../src/index';

describe('NHSBSA Integration', () => {
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

    const results = await fetchDataNHSBSA('test');

    expect(fetch).toHaveBeenCalledWith(
      'https://opendata.nhsbsa.net/api/3/action/package_search?q=test',
      expect.any(Object)
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
      source: 'NHSBSA',
      updated: new Date(mockDataset.metadata_modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
    });
  });

  it('handles empty search results gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: {
          results: []
        }
      })
    } as Response);

    const results = await fetchDataNHSBSA('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('Network error');
  });

  it('handles non-200 responses gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('NHSBSA API returned 500');
  });

  it('handles missing data structure gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false
      })
    } as Response);

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('Invalid response format from NHSBSA API');
  });
}); 