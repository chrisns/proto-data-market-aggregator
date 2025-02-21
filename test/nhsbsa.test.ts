import { describe, it, expect, vi } from 'vitest';
import { fetchDataNHSBSA } from '../src/index';
import { DATE_FORMAT } from '../src/index';

describe('NHS BSA Integration', () => {
  it('constructs the correct API URL and request body', async () => {
    const mockResponse = {
      success: true,
      result: {
        results: [{
          id: 'test-dataset',
          title: 'Test Dataset',
          notes: 'Test Description',
          license_title: 'Open Government License',
          organization: {
            title: 'NHS BSA',
            description: 'NHS Business Services Authority'
          },
          metadata_modified: '2024-01-01T12:00:00Z',
          resources: [{
            url: 'https://example.com/dataset'
          }]
        }]
      }
    };

    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const results = await fetchDataNHSBSA('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://opendata.nhsbsa.net/api/3/action/package_search?q=test',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'test-dataset',
      title: 'Test Dataset',
      description: 'Test Description',
      subtitle: 'Open Government License',
      provider: {
        title: 'NHS BSA',
        description: 'NHS Business Services Authority'
      },
      url: 'https://example.com/dataset',
      source: 'NHS BSA',
      updated: new Date('2024-01-01T12:00:00Z').toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
    });
  });

  it('handles empty search results gracefully', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: {
            results: []
          }
        })
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const results = await fetchDataNHSBSA('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.reject(new Error('API Error'))
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('NHS BSA API returned 500');
  });

  it('handles missing data structure gracefully', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: false
        })
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchDataNHSBSA('test')).rejects.toThrow('Invalid response format from NHS BSA API');
  });
}); 