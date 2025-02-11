// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it('responds with Hello World! (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});
});

describe('Data Scraper', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.resetAllMocks();
		global.fetch = vi.fn();
	});

	describe('Agrimetrics Integration', () => {
		const mockAgrimetricsResponse = {
			dataSets: [{
				id: "test-id-1",
				title: "Test Dataset 1",
				description: "Test Description 1",
				tags: ["soil", "test"],
				visibility: "PUBLIC",
				creator: "Test Creator",
				summary: "Test Summary",
				category: "Test Category",
				distributions: [{
					id: "dist-1",
					title: "Distribution 1",
					description: "Distribution Description",
					accessURL: "https://test.com/data/1"
				}],
				resources: [],
				modified: "2024-03-20T12:00:00Z"
			}],
			total: 1,
			offset: 0,
			limit: 13
		};

		it('constructs correct Agrimetrics API URL with search parameters', async () => {
			const searchTerm = "soil test";
			const expectedUrl = "https://app.agrimetrics.co.uk/backend/catalog/api/catalog/data-sets?" +
				new URLSearchParams({
					exchange: "agrimetrics",
					tagRelationship: "narrower",
					extendedText: searchTerm,
					onlyFeatured: "false",
					onlyOwned: "false",
					showHidden: "false",
					showEditable: "false",
					identities: "PUBLIC",
					offset: "0",
					limit: "13",
					sort: "relevance"
				}).toString();

			(global.fetch as Mock).mockResolvedValueOnce({
				json: () => Promise.resolve(mockAgrimetricsResponse)
			});

			const request = new IncomingRequest(`http://example.com?search=${encodeURIComponent(searchTerm)}`);
			const ctx = createExecutionContext();
			await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(global.fetch).toHaveBeenCalledWith(expectedUrl);
		});

		it('correctly processes and formats Agrimetrics search results', async () => {
			(global.fetch as Mock).mockResolvedValueOnce({
				json: () => Promise.resolve(mockAgrimetricsResponse)
			});

			const request = new IncomingRequest('http://example.com?search=soil');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			const html = await response.text();

			// Verify the response contains the expected data
			expect(html).toContain("Test Dataset 1");
			expect(html).toContain("Test Description 1");
			expect(html).toContain("Test Creator");
			expect(html).toContain("https://test.com/data/1");
		});

		it('handles empty Agrimetrics search results gracefully', async () => {
			(global.fetch as Mock).mockResolvedValueOnce({
				json: () => Promise.resolve({ dataSets: [], total: 0, offset: 0, limit: 13 })
			});

			const request = new IncomingRequest('http://example.com?search=nonexistent');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			const html = await response.text();

			// Verify the response doesn't contain any Agrimetrics results
			expect(html).not.toContain("Agrimetrics");
		});

		it('handles Agrimetrics API errors gracefully', async () => {
			(global.fetch as Mock).mockRejectedValueOnce(new Error('API Error'));

			const request = new IncomingRequest('http://example.com?search=soil');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// Verify the response is still successful even if Agrimetrics fails
			expect(response.status).toBe(200);
		});
	});
});
