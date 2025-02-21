import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDataSSEN, DATE_FORMAT } from '../src/index';

describe('SSEN Integration', () => {
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
      organization: {
        title: 'SSEN Distribution',
        description: 'Test Organization Description',
        type: 'organization',
        id: 'test-org-id',
        name: 'ssen',
        image_url: 'test-image.png'
      },
      author: 'Test Author',
      license_title: 'Test License',
      tags: [
        {
          display_name: 'Energy Data',
          id: 'tag1',
          name: 'energy-data',
          state: 'active',
          vocabulary_id: null
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

    const results = await fetchDataSSEN('test');

    expect(fetch).toHaveBeenCalledWith(
      'https://ckan-prod.sse.datopian.com/api/action/package_search?q=test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json'
        }),
        cf: expect.objectContaining({
          cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
          cacheEverything: true,
          cacheKey: 'ssen-test'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: mockDataset.id,
      title: mockDataset.title,
      description: mockDataset.notes,
      subtitle: mockDataset.tags[0].display_name,
      provider: {
        title: mockDataset.organization.title,
        description: mockDataset.organization.description
      },
      url: mockDataset.url,
      source: 'SSEN',
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

    const results = await fetchDataSSEN('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));
    await expect(fetchDataSSEN('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500
    } as Response);

    await expect(fetchDataSSEN('test')).rejects.toThrow('SSEN API returned 500');
  });

  it('handles invalid response format gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    } as Response);

    await expect(fetchDataSSEN('test')).rejects.toThrow('Invalid response format from SSEN API');
  });

  it('uses fallback URL when dataset URL is not available', async () => {
    const mockDataset = {
      id: 'test-dataset',
      title: 'Test Dataset',
      name: 'test-dataset-name',
      notes: 'Test Description',
      metadata_modified: '2024-01-01T12:00:00Z',
      organization: {
        title: 'SSEN Distribution',
        description: 'Test Organization Description',
        type: 'organization',
        id: 'test-org-id',
        name: 'ssen',
        image_url: 'test-image.png'
      },
      author: 'Test Author',
      license_title: 'Test License',
      tags: [],
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

    const results = await fetchDataSSEN('test');
    expect(results[0].url).toBe('https://ckan-prod.sse.datopian.com/dataset/test-dataset-name');
  });
}); 