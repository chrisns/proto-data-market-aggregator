import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDataAWSMarketplace } from '../src/index';

describe('AWS Marketplace Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function compressData(data: any): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const rawData = encoder.encode(JSON.stringify(data));

    // Create a compression stream
    const cs = new CompressionStream('deflate');
    const compressedStream = new Response(
      new Blob([rawData]).stream().pipeThrough(cs)
    ).body;

    if (!compressedStream) {
      throw new Error('Failed to create compression stream');
    }

    // Read the compressed data
    const reader = compressedStream.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const compressedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }

    return compressedData.buffer;
  }

  it('constructs correct AWS Marketplace API URL and request body', async () => {
    const mockData = { ListingSummaries: [] };
    const compressedBuffer = await compressData(mockData);

    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(compressedBuffer)
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    await fetchDataAWSMarketplace('test');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://aws.amazon.com/marketplace/api/awsmpdiscovery',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'deflate, gzip',
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSMPDiscoveryService.SearchListings'
        },
        body: expect.stringContaining('test')
      })
    );
  });

  it('correctly processes and formats AWS Marketplace search results', async () => {
    const mockData = {
      ListingSummaries: [{
        Id: 'test-id',
        DisplayAttributes: {
          Title: 'Test Product',
          LongDescription: 'Test Description'
        },
        Categories: [
          { DisplayName: 'Category 1' },
          { DisplayName: 'Category 2' }
        ],
        ProductAttributes: {
          Creator: {
            DisplayName: 'Test Creator'
          }
        },
        OfferSummary: {
          PricingSummary: 'Free'
        }
      }]
    };

    const compressedBuffer = await compressData(mockData);
    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(compressedBuffer)
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const results = await fetchDataAWSMarketplace('test');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(expect.objectContaining({
      id: 'test-id',
      title: 'Test Product',
      description: 'Test Description',
      subtitle: 'Category 1, Category 2',
      provider: {
        title: 'Test Creator',
        description: 'Free'
      },
      url: expect.stringContaining('test-id'),
      source: 'AWS Marketplace',
      updated: 'unknown'
    }));
  });

  it('handles empty AWS Marketplace search results gracefully', async () => {
    const mockData = { ListingSummaries: [] };
    const compressedBuffer = await compressData(mockData);

    const mockResponse = {
      ok: true,
      arrayBuffer: () => Promise.resolve(compressedBuffer)
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const results = await fetchDataAWSMarketplace('test');
    expect(results).toHaveLength(0);
  });

  it('handles AWS Marketplace API errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('API Error'));

    await expect(fetchDataAWSMarketplace('test')).rejects.toThrow('API Error');
  });

  it('handles non-200 responses gracefully', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    await expect(fetchDataAWSMarketplace('test')).rejects.toThrow('AWS Marketplace API error: Status 404');
  });
}); 