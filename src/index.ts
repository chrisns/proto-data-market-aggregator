import { Router } from 'itty-router'

import template from "./template"

const router = Router()

interface QueryStats {
	source: string;
	durationMs: number;
	error?: string;
	resultCount: number;
}

router.get("/", async ({ query }) => {
	const searchTerm = query.search as string;
	const stats: QueryStats[] = [];

	if (!searchTerm) {
		return new Response(template("search for something", [], []), {
			headers: {
				"content-type": "text/html;charset=UTF-8",
			}
		});
	}

	const startTime = Date.now();
	const [snowflake, databricks, ons, defra, agrimetrics] = await Promise.all([
		fetchDataSnowflake(searchTerm).then(results => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Snowflake", durationMs: duration, resultCount: results.length });
			return results;
		}).catch(error => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Snowflake", durationMs: duration, error: error.message, resultCount: 0 });
			return [];
		}),
		fetchDataDatabricks(searchTerm).then(results => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Databricks", durationMs: duration, resultCount: results.length });
			return results;
		}).catch(error => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Databricks", durationMs: duration, error: error.message, resultCount: 0 });
			return [];
		}),
		fetchDataONS(searchTerm).then(results => {
			const duration = Date.now() - startTime;
			stats.push({ source: "ONS", durationMs: duration, resultCount: results.length });
			return results;
		}).catch(error => {
			const duration = Date.now() - startTime;
			stats.push({ source: "ONS", durationMs: duration, error: error.message, resultCount: 0 });
			return [];
		}),
		fetchDataDefra(searchTerm).then(results => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Defra", durationMs: duration, resultCount: results.length });
			return results;
		}).catch(error => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Defra", durationMs: duration, error: error.message, resultCount: 0 });
			return [];
		}),
		fetchDataAgrimetrics(searchTerm).then(results => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Agrimetrics", durationMs: duration, resultCount: results.length });
			return results;
		}).catch(error => {
			const duration = Date.now() - startTime;
			stats.push({ source: "Agrimetrics", durationMs: duration, error: error.message, resultCount: 0 });
			return [];
		})
	]);

	// Interweave results from all sources
	const maxLength = Math.max(
		snowflake.length,
		databricks.length,
		ons.length,
		defra.length,
		agrimetrics.length
	);
	const interweavedResults = [];

	for (let i = 0; i < maxLength; i++) {
		if (snowflake[i]) {
			interweavedResults.push(snowflake[i]);
		}
		if (databricks[i]) {
			interweavedResults.push(databricks[i]);
		}
		if (ons[i]) {
			interweavedResults.push(ons[i]);
		}
		if (defra[i]) {
			interweavedResults.push(defra[i]);
		}
		if (agrimetrics[i]) {
			interweavedResults.push(agrimetrics[i]);
		}
	}

	return new Response(template(searchTerm, interweavedResults, stats), {
		headers: {
			"content-type": "text/html;charset=UTF-8",
		}
	});
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
					updated: new Date(item.typeSpecific.listing.lastPublished).toLocaleString('en-GB', {
						hour: '2-digit',
						minute: '2-digit',
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					}).replace(',', ''),
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
				updated: new Date(parseInt(item.summary.updated_at)).toLocaleString('en-GB', {
					hour: '2-digit',
					minute: '2-digit',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				}).replace(',', '')
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
			updated: new Date(item.modified).toLocaleString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}).replace(',', '')
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
			updated: new Date(item.modified).toLocaleString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}).replace(',', '')
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
			updated: new Date(item.modified).toLocaleString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			}).replace(',', '')
		}));
	} catch (error) {
		console.error('Error fetching Agrimetrics data:', error);
		throw error;
	}
}

router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.fetch
} satisfies ExportedHandler<Env>;
