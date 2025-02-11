import { Router } from 'itty-router'

import template from "./template"

const router = Router()

router.get("/", async ({ query }) => {
	const snowflake = query.search ? await fetchDataSnowflake(query.search as string) : []
	const databricks = query.search ? await fetchDataDatabricks(query.search as string) : []
	const ons = query.search ? await fetchDataONS(query.search as string) : []
	const defra = query.search ? await fetchDataDefra(query.search as string) : []
	const agrimetrics = query.search ? await fetchDataAgrimetrics(query.search as string) : []

	if (!query.search) {
		query.search = "search for something"
	}

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

	const response = template(query.search as string, interweavedResults)
	return new Response(response, {
		headers: {
			"content-type": "text/html;charset=UTF-8",
		}
	});
	return new Response("Hello, world! This is the root page of your Worker template.")
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
	const response = await fetch("https://app.snowflake.com/v0/guest/snowscope/search", {
		"body": JSON.stringify({
			query: searchParam,
			sort: { field: "mostRelevant" },
			numSnippets: 0,
			corpus: "marketplace",
			client: "marketplaceSearch",
			resultGroups: true
		}),
		"method": "POST"
	});

	const data = await response.json() as SnowflakeResponse;

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
					// logo: item.typeSpecific.listing.provider.image,
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
		})
}

async function fetchDataDatabricks(searchParam: string): Promise<ListingResult[]> {
	const response = await fetch("https://marketplace.databricks.com/api/2.0/public-marketplace-listings", {
		cf: {
			cacheTtlByStatus: { "200-299": 1209600, 404: 1, "500-599": 0 }, // 2 weeks in seconds (14 * 24 * 60 * 60)
		}
	})

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

	const results = await response.json() as DatabricksResponse;

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
	})
	const filtered_results = formatted_results.filter(item =>
		item.title.toLowerCase().includes(searchParam.toLowerCase()) ||
		item.description.toLowerCase().includes(searchParam.toLowerCase()) ||
		item.subtitle.toLowerCase().includes(searchParam.toLowerCase())
	)

	return filtered_results;
}

async function fetchDataONS(searchParam: string): Promise<ListingResult[]> {
	const response = await fetch(`https://ons.metadata.works/_next/data/QT8kYMhY79tILeprNK9a8/browser/search.json?searchterm=${encodeURIComponent(searchParam)}`);
	const data = await response.json() as ONSSearchResponse;

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
}

async function fetchDataDefra(searchParam: string): Promise<ListingResult[]> {
	const response = await fetch(`https://environment.data.gov.uk/searchresults?query=${encodeURIComponent(searchParam)}&searchtype=&orderby=default&pagesize=10&page=1`);
	const html = await response.text();

	// Extract the JSON data from the __NEXT_DATA__ script tag
	const scriptTagMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
	if (!scriptTagMatch) {
		return [];
	}

	const data = JSON.parse(scriptTagMatch[1]) as DefraSearchResponse;

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

		const response = await fetch(`${baseUrl}?${params.toString()}`);
		const data = await response.json() as AgrimetricsSearchResponse;

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
		console.error("Error fetching Agrimetrics data:", error);
		return [];
	}
}

router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.fetch
} satisfies ExportedHandler<Env>;
