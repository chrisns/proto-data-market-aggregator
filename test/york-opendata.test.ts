import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDataYorkOpenData, DATE_FORMAT } from '../src/index';

describe('York Open Data Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('constructs the correct API URL and formats response properly', async () => {
    const mockDataset = {
      id: 'test-dataset',
      title: 'Test Dataset',
      name: 'test-dataset-name',
      notes: 'Test Description',
      metadata_modified: '2024-01-01T12:00:00Z',
      metadata_created: '2024-01-01T12:00:00Z',
      organization: {
        title: 'City of York Council',
        description: 'Test Organization Description',
        created: '2024-01-01T12:00:00Z',
        name: 'city-of-york-council',
        is_organization: true,
        state: 'active',
        image_url: 'test-image.jpg',
        type: 'organization',
        id: 'test-org-id',
        approval_status: 'approved'
      },
      author: 'Test Author',
      maintainer: 'Test Maintainer',
      license_title: 'Test License',
      groups: [
        {
          display_name: 'Environment',
          description: 'Environmental Data',
          image_display_url: 'test-image.png',
          title: 'Environment',
          id: 'env-group',
          name: 'environment'
        }
      ],
      resources: [
        {
          id: 'resource1',
          url: 'https://example.com/dataset',
          format: 'CSV',
          name: 'Test Resource',
          description: 'Test Resource Description',
          created: '2024-01-01T12:00:00Z',
          state: 'active',
          last_modified: '2024-01-01T12:00:00Z',
          size: 1000
        }
      ],
      url: 'https://example.com/test-dataset'
    };

    const mockResponse = {
      success: true,
      result: {
        count: 1,
        results: [mockDataset]
      }
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataYorkOpenData('test');

    expect(fetch).toHaveBeenCalledWith(
      'https://data.yorkopendata.org/api/action/package_search?q=test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json'
        }),
        cf: expect.objectContaining({
          cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
          cacheEverything: true,
          cacheKey: 'york-opendata-test'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: mockDataset.id,
      title: mockDataset.title,
      description: mockDataset.notes,
      subtitle: mockDataset.groups[0].display_name,
      provider: {
        title: mockDataset.organization.title,
        description: mockDataset.organization.description
      },
      url: mockDataset.url,
      source: 'York Open Data',
      updated: new Date(mockDataset.metadata_modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
    });
  });

  it('handles empty search results gracefully', async () => {
    const mockResponse = {
      success: true,
      result: {
        count: 0,
        results: []
      }
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataYorkOpenData('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));
    await expect(fetchDataYorkOpenData('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);

    await expect(fetchDataYorkOpenData('test')).rejects.toThrow('York Open Data API returned 500');
  });

  it('handles invalid response format gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    } as Response);

    await expect(fetchDataYorkOpenData('test')).rejects.toThrow('Invalid response format from York Open Data API');
  });

  it('uses fallback URL when dataset URL is not available', async () => {
    const mockDataset = {
      id: 'test-dataset',
      title: 'Test Dataset',
      name: 'test-dataset-name',
      notes: 'Test Description',
      metadata_modified: '2024-01-01T12:00:00Z',
      metadata_created: '2024-01-01T12:00:00Z',
      organization: {
        title: 'City of York Council',
        description: 'Test Organization Description',
        created: '2024-01-01T12:00:00Z',
        name: 'city-of-york-council',
        is_organization: true,
        state: 'active',
        image_url: 'test-image.jpg',
        type: 'organization',
        id: 'test-org-id',
        approval_status: 'approved'
      },
      author: 'Test Author',
      maintainer: 'Test Maintainer',
      license_title: 'Test License',
      groups: [],
      resources: [],
      url: null
    };

    const mockResponse = {
      success: true,
      result: {
        count: 1,
        results: [mockDataset]
      }
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const results = await fetchDataYorkOpenData('test');
    expect(results[0].url).toBe('https://data.yorkopendata.org/dataset/test-dataset-name');
  });
}); 