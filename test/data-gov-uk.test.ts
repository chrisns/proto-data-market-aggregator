import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDataGovUK } from '../src/index';

describe('fetchDataGovUK', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('constructs the correct API URL and request body', async () => {
    const testDate = '2024-03-20T12:00:00Z';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        result: {
          count: 1,
          results: [{
            id: 'test-id',
            title: 'Test Dataset',
            notes: 'Test Description',
            metadata_modified: testDate,
            organization: {
              title: 'Test Organization',
              description: 'Test Org Description'
            },
            license_title: 'Open Government License',
            resources: [{
              url: 'https://example.com/dataset'
            }]
          }]
        }
      })
    });

    globalThis.fetch = mockFetch;

    const results = await fetchDataGovUK('test query');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ckan.publishing.service.gov.uk/api/action/package_search?q=test%20query',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json'
        })
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'test-id',
      title: 'Test Dataset',
      description: 'Test Description',
      subtitle: 'Open Government License',
      provider: {
        title: 'Test Organization',
        description: 'Test Org Description'
      },
      url: 'https://example.com/dataset',
      source: 'data.gov.uk',
      updated: new Date(testDate).toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(',', '')
    });
  });

  it('handles empty search results gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        result: {
          count: 0,
          results: []
        }
      })
    });

    globalThis.fetch = mockFetch;

    const results = await fetchDataGovUK('nonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles API errors gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('API Error'));
    globalThis.fetch = mockFetch;

    await expect(fetchDataGovUK('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    globalThis.fetch = mockFetch;

    await expect(fetchDataGovUK('test')).rejects.toThrow('Data.gov.uk API returned 500');
  });
}); 