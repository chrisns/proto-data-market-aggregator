import { Router } from 'itty-router'

import template from "./template"

const router = Router()

router.get("/", async ({ query }) => {
	const snowflake = query.search ? await fetchDataSnowflake(query.search as string) : []
	const databricks = query.search ? await fetchDataDatabricks(query.search as string) : []
	const ons = query.search ? await fetchDataONS(query.search as string) : []

	if (!query.search) {
		query.search = "search for something"
	}

	// Interweave results from all three sources
	const maxLength = Math.max(snowflake.length, databricks.length, ons.length);
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

	return (await response.json()).resultGroups[0].results
		.filter(item => item.type === "listing")
		.map(item => {
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
	const response = await fetch("https://marketplace.databricks.com/api/2.0/public-marketplace-listings")

	const results = await response.json()

	const formatted_results = results.listings.map((item: any) => {
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

router.all("*", () => new Response("404, not found!", { status: 404 }))

export default {
	fetch: router.fetch
} satisfies ExportedHandler<Env>;

