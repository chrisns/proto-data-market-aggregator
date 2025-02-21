import { Router } from 'itty-router'
import * as cheerio from 'cheerio'

import template from "./template"

const router = Router()

export const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	hour: '2-digit',
	minute: '2-digit',
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
};

interface QueryStats {
	source: string;
	duration: number;
	durationMs: number;
	resultCount: number;
	error?: string;
}

function getCacheControlHeader(): string {
	return 'public, max-age=1209600, stale-while-revalidate=86400'; // 2 weeks cache, 1 day stale
}

function interweaveResults(results: ListingResult[]): ListingResult[] {
	const sourceGroups = new Map<string, ListingResult[]>();

	// Group results by source
	for (const result of results) {
		if (!sourceGroups.has(result.source)) {
			sourceGroups.set(result.source, []);
		}
		sourceGroups.get(result.source)!.push(result);
	}

	const interwoven: ListingResult[] = [];
	let hasMore = true;
	let index = 0;

	// Interweave results from each source
	while (hasMore) {
		hasMore = false;
		for (const [_, sourceResults] of sourceGroups) {
			if (index < sourceResults.length) {
				interwoven.push(sourceResults[index]);
				hasMore = true;
			}
		}
		index++;
	}

	return interwoven;
}

router.get("/", async (req) => {
	const url = new URL(req.url);
	const searchParam = url.searchParams.get("search");
	const queryStats: QueryStats[] = [];

	if (!searchParam) {
		return new Response(template('', [], []), {
			headers: {
				"content-type": "text/html;charset=UTF-8",
				"Cache-Control": getCacheControlHeader()
			},
		});
	}

	const startTime = Date.now();

	try {
		const results = await Promise.all([
			fetchDataSnowflake(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Snowflake",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Snowflake",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataDatabricks(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Databricks",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Databricks",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataONS(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "ONS",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "ONS",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataDefra(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Defra",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Defra",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataAgrimetrics(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Agrimetrics",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Agrimetrics",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataAWSMarketplace(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "AWS Marketplace",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "AWS Marketplace",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataDatarade(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Datarade",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "Datarade",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataGovUK(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "data.gov.uk",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "data.gov.uk",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				}),
			fetchDataNHSBSA(searchParam)
				.then(results => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "NHS BSA",
						duration: duration,
						durationMs: duration,
						resultCount: results.length
					});
					return results;
				})
				.catch(error => {
					const duration = Date.now() - startTime;
					queryStats.push({
						source: "NHS BSA",
						duration: duration,
						durationMs: duration,
						resultCount: 0,
						error: error.message
					});
					return [];
				})
		]);

		const allResults = results.flat();
		const interwovenResults = interweaveResults(allResults);

		return new Response(template(searchParam, interwovenResults, queryStats), {
			headers: {
				"content-type": "text/html;charset=UTF-8",
				"Cache-Control": getCacheControlHeader()
			},
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
		return new Response(`Error: ${errorMessage}`, { status: 500 });
	}
})

interface ListingProvider {
	title: string,
	description: string,
	// logo: string,
}

interface ListingResult {
	id: string;
	title: string;
	description: string;
	subtitle: string;
	provider: ListingProvider;
	url: string;
	source: string,
	updated: string,
}

interface ONSSearchResponse {
	pageProps: {
		searchResult: {
			content: Array<{
				id: string;
				title: string;
				abstract: string;
				keywords?: string[];
				publisher: string;
				origin?: {
					name: string;
					link: string;
				};
				modified: string;
			}>;
		};
	};
}

interface DefraSearchResponse {
	props: {
		pageProps: {
			datasets: Array<{
				id: string;
				title: string;
				description: string;
				creator: string;
				modified: number;
				tags: string[];
			}>;
		};
	};
}

interface AgrimetricsDataSet {
	id: string;
	title: string;
	description: string;
	tags: string[];
	visibility: string;
	creator: string;
	summary: string;
	category: string;
	distributions: Array<{
		id: string;
		title: string;
		description: string;
		accessURL?: string;
		downloadURL?: string;
	}>;
	resources: Array<{
		id: string;
		title: string;
		description: string;
		url: string;
	}>;
	modified: string;
}

interface AgrimetricsSearchResponse {
	dataSets: AgrimetricsDataSet[];
	total: number;
	offset: number;
	limit: number;
}

interface SnowflakeListing {
	type: string;
	typeSpecific: {
		globalName: string;
		listing: {
			title: string;
			description: string;
			subtitle: string;
			provider: {
				title: string;
				description: string;
				image?: string;
			};
			url: string;
			lastPublished: string;
		};
	};
}

interface SnowflakeResponse {
	resultGroups: Array<{
		results: SnowflakeListing[];
	}>;
}

interface AWSMarketplaceBadge {
	DisplayName: string;
	Value: string;
}

interface AWSMarketplaceCategory {
	DisplayName: string;
	Value: string;
}

interface AWSMarketplaceDisplayAttributes {
	LongDescription: string;
	ShortDescription: string;
	Title: string;
}

interface AWSMarketplaceFulfillmentOption {
	DisplayName: string;
	Value: string;
}

interface AWSMarketplaceMedia {
	DefaultDomain: string;
	Path: string;
}

interface AWSMarketplacePricingModel {
	DisplayName: string;
	Value: string;
}

interface AWSMarketplaceOfferSummary {
	PricingModels: AWSMarketplacePricingModel[];
	PricingSummary: string;
	PricingUnits: any[];
	Vendors: any[];
}

interface AWSMarketplaceCreator {
	DisplayName: string;
	Value: string;
}

interface AWSMarketplaceProductAttributes {
	BaseProductId: string;
	Creator: AWSMarketplaceCreator;
}

interface AWSMarketplaceListingSummary {
	Badges: AWSMarketplaceBadge[];
	Categories: AWSMarketplaceCategory[];
	DisplayAttributes: AWSMarketplaceDisplayAttributes;
	FulfillmentOptionTypes: AWSMarketplaceFulfillmentOption[];
	Id: string;
	Media: {
		LISTING_LOGO_THUMBNAIL?: AWSMarketplaceMedia;
		LOGO_THUMBNAIL?: AWSMarketplaceMedia;
	};
	OfferSummary: AWSMarketplaceOfferSummary;
	ProductAttributes: AWSMarketplaceProductAttributes;
	Reviews: any;
}

interface AWSMarketplaceSearchResponse {
	ListingSummaries: AWSMarketplaceListingSummary[];
}

interface DataGovUKOrganization {
	id: string;
	name: string;
	title: string;
	description: string;
}

interface DataGovUKResource {
	id: string;
	url: string;
	format: string;
	name: string;
	description: string;
}

interface DataGovUKDataset {
	id: string;
	title: string;
	notes: string;
	metadata_modified: string;
	organization: DataGovUKOrganization;
	license_title: string;
	resources: DataGovUKResource[];
}

interface DataGovUKResponse {
	success: boolean;
	result: {
		count: number;
		results: DataGovUKDataset[];
	};
}

async function fetchDataSnowflake(searchParam: string): Promise<ListingResult[]> {
	try {
		const response = await fetch("https://app.snowflake.com/v0/guest/snowscope/search", {
			"body": JSON.stringify({
				query: searchParam,
				sort: { field: "mostRelevant" },
				numSnippets: 0,
				corpus: "marketplace",
				client: "marketplaceSearch",
				resultGroups: true
			}),
			"method": "POST",
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `snowflake-${searchParam}`
			}
		});

		const contentType = response.headers.get('content-type');
		if (!response.ok || !contentType?.includes('application/json')) {
			const error = `Snowflake API error: Status ${response.status}, Content-Type: ${contentType}`;
			console.error(error);
			throw new Error(error);
		}

		const data = await response.json() as SnowflakeResponse;

		if (!data?.resultGroups?.[0]?.results) {
			const error = 'Snowflake API response missing expected data structure';
			console.error(error);
			throw new Error(error);
		}

		return data.resultGroups[0].results
			.filter((item: SnowflakeListing) => item.type === "listing")
			.map((item: SnowflakeListing) => {
				return {
					id: item.typeSpecific.globalName,
					title: item.typeSpecific.listing.title,
					description: item.typeSpecific.listing.description,
					subtitle: item.typeSpecific.listing.subtitle,
					provider: {
						title: item.typeSpecific.listing.provider.title,
						description: item.typeSpecific.listing.provider.description,
					},
					url: item.typeSpecific.listing.url,
					updated: new Date(item.typeSpecific.listing.lastPublished).toLocaleString('en-GB', DATE_FORMAT).replace(',', ''),
					source: "Snowflake",
				}
			});
	} catch (error) {
		console.error('Error fetching Snowflake data:', error);
		throw error;
	}
}

async function fetchDataDatabricks(searchParam: string): Promise<ListingResult[]> {
	interface DatabricksListing {
		id: string;
		summary: {
			name: string;
			subtitle: string;
			updated_at: string;
		};
		detail: {
			description: string;
		};
		provider_summary: {
			name: string;
			description: string;
		};
	}

	interface DatabricksResponse {
		listings: DatabricksListing[];
	}

	try {
		const response = await fetch("https://marketplace.databricks.com/api/2.0/public-marketplace-listings", {
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `databricks`
			}
		});

		const contentType = response.headers.get('content-type');
		if (!response.ok || !contentType?.includes('application/json')) {
			const error = `Databricks API error: Status ${response.status}, Content-Type: ${contentType}`;
			console.error(error);
			throw new Error(error);
		}

		const results = await response.json() as DatabricksResponse;

		if (!results?.listings) {
			console.error('Databricks API response missing expected data structure');
			return [];
		}

		const formatted_results = results.listings.map((item: DatabricksListing) => {
			return {
				id: item.id,
				title: item.summary.name,
				subtitle: item.summary.subtitle,
				description: item.detail.description,
				provider: {
					title: item.provider_summary.name,
					description: item.provider_summary.description
				},
				url: `https://marketplace.databricks.com/details(${item.id})/listing`,
				source: "Databricks",
				updated: new Date(parseInt(item.summary.updated_at)).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
			}
		});

		return formatted_results.filter(item =>
			item.title.toLowerCase().includes(searchParam.toLowerCase()) ||
			item.description.toLowerCase().includes(searchParam.toLowerCase()) ||
			item.subtitle.toLowerCase().includes(searchParam.toLowerCase())
		);
	} catch (error) {
		console.error('Error fetching Databricks data:', error);
		return [];
	}
}

async function fetchDataONS(searchParam: string): Promise<ListingResult[]> {
	try {
		// First, fetch the page to get the build ID
		const pageResponse = await fetch('https://ons.metadata.works/browser/search', {
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
				cacheEverything: true,
				cacheKey: 'ons-buildid'
			}
		});

		if (!pageResponse.ok) {
			const error = `ONS initial page fetch error: Status ${pageResponse.status}`;
			console.error(error);
			throw new Error(error);
		}

		const html = await pageResponse.text();
		const scriptTagMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

		if (!scriptTagMatch) {
			const error = 'ONS page missing __NEXT_DATA__ script tag';
			console.error(error);
			throw new Error(error);
		}

		const nextData = JSON.parse(scriptTagMatch[1]);
		const buildId = nextData.buildId;

		if (!buildId) {
			const error = 'ONS page missing buildId';
			console.error(error);
			throw new Error(error);
		}

		// Now make the actual search request with the current buildId
		const searchResponse = await fetch(`https://ons.metadata.works/_next/data/${buildId}/browser/search.json?searchterm=${encodeURIComponent(searchParam)}`, {
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 },
				cacheEverything: true,
				cacheKey: `ons-search-${searchParam}`
			}
		});

		const contentType = searchResponse.headers.get('content-type');
		if (!searchResponse.ok || !contentType?.includes('application/json')) {
			const error = `ONS search API error: Status ${searchResponse.status}, Content-Type: ${contentType}`;
			console.error(error);
			throw new Error(error);
		}

		const data = await searchResponse.json() as ONSSearchResponse;

		if (!data?.pageProps?.searchResult?.content) {
			const error = 'ONS API response missing expected data structure';
			console.error(error);
			throw new Error(error);
		}

		return data.pageProps.searchResult.content.map(item => ({
			id: item.id,
			title: item.title,
			description: item.abstract,
			subtitle: item.keywords?.join(", ") || "",
			provider: {
				title: item.publisher,
				description: item.origin?.name || "ONS SRS Metadata Catalogue",
			},
			url: item.origin?.link || `https://ons.metadata.works/browser/dataset/${item.id}/0`,
			source: "ONS",
			updated: new Date(item.modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching ONS data:', error);
		throw error;
	}
}

async function fetchDataDefra(searchParam: string): Promise<ListingResult[]> {
	try {
		const response = await fetch(`https://environment.data.gov.uk/searchresults?query=${encodeURIComponent(searchParam)}&searchtype=&orderby=default&pagesize=10&page=1`, {
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `defra-${searchParam}`
			}
		});

		if (!response.ok) {
			const error = `Defra API error: Status ${response.status}`;
			console.error(error);
			throw new Error(error);
		}

		const html = await response.text();

		// Extract the JSON data from the __NEXT_DATA__ script tag
		const scriptTagMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
		if (!scriptTagMatch) {
			const error = 'Defra API response missing expected script tag';
			console.error(error);
			throw new Error(error);
		}

		const data = JSON.parse(scriptTagMatch[1]) as DefraSearchResponse;

		if (!data?.props?.pageProps?.datasets) {
			const error = 'Defra API response missing expected data structure';
			console.error(error);
			throw new Error(error);
		}

		return data.props.pageProps.datasets.map(item => ({
			id: item.id,
			title: item.title,
			description: item.description,
			subtitle: item.tags?.join(", ") || "",
			provider: {
				title: item.creator,
				description: "Defra Data Services Platform",
			},
			url: `https://environment.data.gov.uk/dataset/${item.id}`,
			source: "Defra",
			updated: new Date(item.modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching Defra data:', error);
		throw error;
	}
}

async function fetchDataAgrimetrics(query: string): Promise<ListingResult[]> {
	try {
		const baseUrl = "https://app.agrimetrics.co.uk/backend/catalog/api/catalog/data-sets";
		const params = new URLSearchParams({
			exchange: "agrimetrics",
			tagRelationship: "narrower",
			extendedText: query,
			onlyFeatured: "false",
			onlyOwned: "false",
			showHidden: "false",
			showEditable: "false",
			identities: "PUBLIC",
			offset: "0",
			limit: "13",
			sort: "relevance"
		});

		const response = await fetch(`${baseUrl}?${params.toString()}`, {
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `agrimetrics-${query}`
			}
		});

		const contentType = response.headers.get('content-type');
		if (!response.ok || !contentType?.includes('application/json')) {
			const error = `Agrimetrics API error: Status ${response.status}, Content-Type: ${contentType}`;
			console.error(error);
			throw new Error(error);
		}

		const data = await response.json() as AgrimetricsSearchResponse;

		if (!data?.dataSets) {
			const error = 'Agrimetrics API response missing expected data structure';
			console.error(error);
			throw new Error(error);
		}

		return data.dataSets.map((item: AgrimetricsDataSet) => ({
			id: item.id,
			title: item.title,
			description: item.description,
			subtitle: item.tags?.join(", ") || "",
			provider: {
				title: item.creator,
				description: "Agrimetrics Data Marketplace",
			},
			url: item.distributions?.[0]?.accessURL ||
				item.distributions?.[0]?.downloadURL ||
				`https://app.agrimetrics.co.uk/datasets/${item.id}`,
			source: "Agrimetrics",
			updated: new Date(item.modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching Agrimetrics data:', error);
		throw error;
	}
}

async function fetchDataDatarade(searchParam: string): Promise<ListingResult[]> {
	const response = await fetch(`https://datarade.ai/search/products?keywords=${encodeURIComponent(searchParam)}`, {
		cf: {
			cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
			cacheEverything: true,
			cacheKey: `datarade-${searchParam}`
		}, headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept-Encoding': "br, gzip"
		}
	});

	if (!response.ok) {
		throw new Error(`Datarade API error: Status ${response.status}`);
	}

	const html = await response.text();
	const $ = cheerio.load(html);
	const products: Array<{
		title: string;
		subtitle: string;
		link: string;
		body: string;
	}> = [];

	// Parse each product card
	$('a.product-card').each((_, element) => {
		const $element = $(element);
		const title = $element.find('h3.product-card__title').text().trim();
		const subtitle = $element.find('span.product-card__subtitle__author').text().trim();
		const link = new URL($element.attr('href') || '', 'https://datarade.ai').toString();
		const body = $element.find('div.product-card__body').text().trim();

		if (title) { // Only add if we at least have a title
			products.push({
				title,
				subtitle,
				link,
				body
			});
		}
	});

	return products.map(product => ({
		id: product.link,  // Using the link as ID since Datarade doesn't provide a separate ID
		title: product.title,
		description: product.body,
		subtitle: product.subtitle,
		provider: {
			title: product.subtitle,  // Using subtitle as provider title since it contains the author/company
			description: ''  // Datarade doesn't provide provider description
		},
		url: product.link,
		source: 'Datarade',
		updated: "unknown"  // Datarade doesn't provide update time
	}));
}

export async function fetchDataAWSMarketplace(searchParam: string): Promise<ListingResult[]> {
	try {
		const response = await fetch("https://aws.amazon.com/marketplace/api/awsmpdiscovery", {
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Accept-Encoding": "deflate, gzip",
				"Content-Type": "application/x-amz-json-1.1",
				"X-Amz-Target": "AWSMPDiscoveryService.SearchListings"
			},
			body: JSON.stringify({
				region: "us-east-1",
				headers: {
					"Accept": "application/json",
					"Accept-Encoding": "deflate, gzip",
					"Content-Type": "application/x-amz-json-1.1",
					"X-Amz-Target": "AWSMPDiscoveryService.SearchListings"
				},
				contentString: JSON.stringify({
					SearchText: searchParam,
					MaxResults: 20,
					Filters: [{
						Type: "FULFILLMENT_OPTION_TYPE",
						Values: ["DATA_EXCHANGE"]
					}],
					Sort: {
						SortBy: "RELEVANT",
						SortOrder: "DESCENDING"
					},
					RequestContext: {
						IntegrationId: "integ-wgprxonvth2vk"
					}
				}),
				method: "POST",
				operation: "SearchListings",
				path: "/"
			}),
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `aws-marketplace-${searchParam}`
			}
		});

		if (!response.ok) {
			const error = `AWS Marketplace API error: Status ${response.status}`;
			console.error(error);
			throw new Error(error);
		}

		// Get the compressed response
		const compressedData = await response.arrayBuffer();

		// Create a DecompressionStream for zlib
		const ds = new DecompressionStream('deflate');

		// Create a stream from the compressed data and pipe it through the DecompressionStream
		const decompressedStream = new Response(
			new Blob([compressedData]).stream().pipeThrough(ds)
		).body;

		if (!decompressedStream) {
			throw new Error('Failed to create decompression stream');
		}

		// Convert the stream to text
		const reader = decompressedStream.getReader();
		const decoder = new TextDecoder();
		let decompressed = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			decompressed += decoder.decode(value, { stream: true });
		}
		decompressed += decoder.decode(); // Flush the decoder

		// Parse the decompressed JSON
		const data = JSON.parse(decompressed) as AWSMarketplaceSearchResponse;

		if (!data?.ListingSummaries) {
			const error = 'AWS Marketplace API response missing expected data structure';
			console.error(error);
			throw new Error(error);
		}

		return data.ListingSummaries.map(item => ({
			id: item.Id,
			title: item.DisplayAttributes.Title,
			description: item.DisplayAttributes.LongDescription,
			subtitle: item.Categories.map(cat => cat.DisplayName).join(", "),
			provider: {
				title: item.ProductAttributes.Creator.DisplayName,
				description: item.OfferSummary.PricingSummary
			},
			url: `https://aws.amazon.com/marketplace/pp/${item.Id}?sr=0-1&ref_=beagle&applicationId=AWSMPContessa`,
			source: "AWS Marketplace",
			updated: "unknown"  // AWS doesn't provide update time
		}));
	} catch (error) {
		console.error('Error fetching AWS Marketplace data:', error);
		throw error;
	}
}

export async function fetchDataGovUK(searchParam: string): Promise<ListingResult[]> {
	const url = `https://ckan.publishing.service.gov.uk/api/action/package_search?q=${encodeURIComponent(searchParam)}`;

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`Data.gov.uk API returned ${response.status}`);
		}

		const data = await response.json() as DataGovUKResponse;

		if (!data.success || !data.result || !Array.isArray(data.result.results)) {
			throw new Error('Invalid response format from Data.gov.uk API');
		}

		return data.result.results.map(dataset => ({
			id: dataset.id,
			title: dataset.title,
			description: dataset.notes || '',
			subtitle: dataset.license_title || '',
			provider: {
				title: dataset.organization?.title || 'Unknown Organization',
				description: dataset.organization?.description || ''
			},
			url: dataset.resources?.[0]?.url || '',
			source: 'data.gov.uk',
			updated: new Date(dataset.metadata_modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching from Data.gov.uk:', error);
		throw error;
	}
}

export async function fetchDataNHSBSA(searchParam: string): Promise<ListingResult[]> {
	const url = `https://opendata.nhsbsa.net/api/3/action/package_search?q=${encodeURIComponent(searchParam)}`;

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Accept': 'application/json'
			},
			cf: {
				cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds
				cacheEverything: true,
				cacheKey: `nhsbsa-${searchParam}`
			}
		});

		if (!response.ok) {
			throw new Error(`NHS BSA API returned ${response.status}`);
		}

		const data = await response.json() as DataGovUKResponse;

		if (!data.success || !data.result || !Array.isArray(data.result.results)) {
			throw new Error('Invalid response format from NHS BSA API');
		}

		return data.result.results.map(dataset => ({
			id: dataset.id,
			title: dataset.title,
			description: dataset.notes || '',
			subtitle: dataset.license_title || '',
			provider: {
				title: dataset.organization?.title || 'NHS Business Services Authority',
				description: dataset.organization?.description || 'NHS Business Services Authority Open Data Portal'
			},
			url: dataset.resources?.[0]?.url || `https://opendata.nhsbsa.net/dataset/${dataset.id}`,
			source: 'NHS BSA',
			updated: new Date(dataset.metadata_modified).toLocaleString('en-GB', DATE_FORMAT).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching from NHS BSA:', error);
		throw error;
	}
}

router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.fetch
} satisfies ExportedHandler<Env>;
