# Data Marketplace Aggregator

[![Security Scanning](https://github.com/chrisns/proto-data-market-aggregator/actions/workflows/security.yml/badge.svg)](https://github.com/chrisns/proto-data-market-aggregator/actions/workflows/security.yml) ![GitHub License](https://img.shields.io/github/license/chrisns/proto-data-market-aggregator) ![GitHub language count](https://img.shields.io/github/languages/count/chrisns/proto-data-market-aggregator) ![GitHub top language](https://img.shields.io/github/languages/top/chrisns/proto-data-market-aggregator)

🔗 **Live Demo**: [https://proto-data-market-aggregator.chrisns.workers.dev/](https://proto-data-market-aggregator.chrisns.workers.dev/)

A Cloudflare Worker that aggregates and searches across multiple data sources including Snowflake, Databricks, ONS, Defra, Agrimetrics, AWS Marketplace, data.gov.uk, and Datarade. This service provides a unified search interface for government and commercial data marketplaces.

## Features

- Unified search interface across multiple data sources
- Real-time data aggregation with parallel processing
- Interleaved results from all sources
- Responsive HTML output with GOV.UK Design System
- Error handling and graceful degradation
- Optimized performance with concurrent API requests
- Intelligent caching strategy for improved response times
- TypeScript-based implementation with strict type checking

## Performance

The service is optimized for speed and efficiency:
- All data source requests are executed in parallel using Promise.all
- No sequential waiting between API calls
- Reduced total response time
- Graceful handling of slow or failed requests
- Results are interleaved as they become available
- Consistent date formatting across all sources

### Caching Strategy
The service implements an intelligent caching strategy using Cloudflare's caching:
- Aggressive caching enabled for all requests (`cacheEverything: true`)
- Custom cache keys based on search parameters for efficient cache hits
- Custom cache durations based on response status:
  - Successful responses (200-299) are cached for 2 weeks
  - Not Found responses (404) are cached for 1 second
  - Server errors (500-599) are not cached
- Cache is applied consistently across all data sources
- Improves response times for repeated searches
- Reduces load on upstream APIs
- Provides resilience against temporary API outages
- Caches all content types, not just static assets

#### Cache Keys
Each data source uses a unique cache key format:
- Snowflake: `snowflake-{search_term}`
- ONS: `ons-{search_term}`
- Defra: `defra-{search_term}`
- Agrimetrics: `agrimetrics-{search_term}`
- Databricks: Uses default URL-based caching

## Supported Data Sources

### Snowflake Marketplace
- Searches through Snowflake's data marketplace via their search API
- Returns listings with titles, descriptions, and provider information
- Direct links to data sources
- POST requests with JSON payload for advanced search capabilities

### Databricks Marketplace
- Searches through Databricks' data marketplace
- Returns dataset listings with detailed information
- Client-side filtering by relevance to search terms
- Supports title, description, and subtitle matching

### ONS SRS Metadata Catalogue
- Searches through ONS Statistical Research Service metadata
- Returns dataset information with keywords and abstracts
- Links to original data sources
- Supports advanced search parameters

### Defra Data Services
- Searches through environmental data from Defra
- Returns dataset information with tags and descriptions
- Links to the Defra data platform
- Handles HTML responses with embedded JSON data

### Agrimetrics Data Marketplace
- Searches through agricultural and environmental datasets
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Tags and categories
  - Creator information
  - Access URLs and download links
  - Last modified dates
- Supports advanced search parameters
- Direct integration with the Agrimetrics API
- Robust error handling with graceful degradation

### Datarade Marketplace
- Searches through Datarade's data marketplace
- Returns product information including:
  - Product title and description
  - Provider/author information
  - Direct links to product pages
  - Product body text with detailed information
- HTML response parsing with robust error handling
- Graceful handling of malformed responses
- Input validation and URL encoding
- Direct integration with Datarade's search interface

### AWS Marketplace
- Searches through AWS Data Exchange listings
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Categories and badges
  - Creator information
  - Pricing details
  - Direct links to AWS Marketplace listings
- Supports advanced filtering for Data Exchange products
- Handles zlib-compressed responses
- Robust error handling with graceful degradation
- Direct integration with AWS Marketplace Discovery API
- Custom cache configuration for improved performance

### data.gov.uk
- Searches through the UK government's open data portal
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Organization information
  - License details
  - Resource URLs and formats
  - Last modified dates
- Direct integration with CKAN API
- Supports advanced search parameters
- Robust error handling with graceful degradation
- Custom cache configuration for improved performance

### OpenDataSoft
- Searches through OpenDataSoft's data platform
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Publisher information
  - Themes and keywords
  - Last modified dates
  - Direct links to dataset pages
- Direct integration with OpenDataSoft Explore API v2.1
- Supports advanced search parameters
- Intelligent caching with 2-week duration for successful responses
- Robust error handling with graceful degradation
- Custom cache configuration for improved performance
- UTF-8 encoding support for international queries
- Parallel execution with other data sources

### NHSBSA Open Data Portal

The NHS Business Services Authority (NHSBSA) Open Data Portal integration provides access to healthcare-related datasets. Features include:

- Direct integration with NHSBSA's CKAN-based API
- Returns comprehensive dataset information including:
  - Title and description
  - Publisher details
  - License information
  - Direct links to dataset resources
  - Last modified dates
- Supports full-text search across all NHSBSA datasets
- Intelligent caching with 2-week duration for successful responses
- Robust error handling and UTF-8 encoding support
- Parallel execution with other data sources

### Open Data Northern Ireland

The Open Data Northern Ireland integration provides access to datasets from the Northern Ireland public sector. Features include:

- Direct integration with Open Data NI's CKAN-based API
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Organization information
  - License details
  - Resource URLs and formats
  - Last modified dates
- Supports full-text search across all Open Data NI datasets
- Intelligent caching with 2-week duration for successful responses
- Robust error handling and UTF-8 encoding support
- Parallel execution with other data sources

### London Datastore

The London Datastore integration provides access to datasets from the Greater London Authority. Features include:

- Direct integration with London Datastore's CKAN-based API
- Returns comprehensive dataset information including:
  - Dataset title and description
  - Organization information
  - License details
  - Resource URLs and formats
  - Last modified dates
- Direct integration with CKAN API
- Supports advanced search parameters
- Robust error handling with graceful degradation
- Custom cache configuration for improved performance
- Base URL: `https://data.london.gov.uk/api/action/package_search`
- Query Parameters:
  - `q`: The search query

## API Integration Details

### Response Format
All data sources are normalized to a common format:
```typescript
interface ListingResult {
    id: string;
    title: string;
    description: string;
    subtitle: string;
    provider: {
        title: string;
        description: string;
    };
    url: string;
    source: string;
    updated: string;
}
```

### AWS Marketplace API
The integration with AWS Marketplace uses their Discovery API with the following details:
- Base URL: `https://aws.amazon.com/marketplace/api/awsmpdiscovery`
- Method: POST
- Headers:
  - `Accept`: application/json
  - `Accept-Encoding`: deflate, gzip
  - `Content-Type`: application/x-amz-json-1.1
  - `X-Amz-Target`: AWSMPDiscoveryService.SearchListings
- Request Body:
  - `SearchText`: The search query
  - `MaxResults`: 20 (configurable)
  - `Filters`: Configured for DATA_EXCHANGE products
  - `Sort`: By relevance, descending order
- Response Format:
```typescript
interface AWSMarketplaceListingSummary {
    Id: string;
    DisplayAttributes: {
        Title: string;
        LongDescription: string;
    };
    Categories: Array<{
        DisplayName: string;
    }>;
    ProductAttributes: {
        Creator: {
            DisplayName: string;
        };
    };
    OfferSummary: {
        PricingSummary: string;
    };
}
```
- Response Handling:
  - Handles zlib-compressed responses
  - Decompresses using Web Streams API
  - Maps to common ListingResult format
  - Includes pricing information
  - Preserves category information

### Datarade API
The integration with Datarade uses their search interface with the following details:
- Base URL: `https://datarade.ai/search/products`
- Query Parameters:
  - `keywords`: The search query
- Response Format:
```typescript
interface DataradeProduct {
    title: string;      // Product title from h3.product-card__title
    subtitle: string;   // Author/provider from span.product-card__subtitle__author
    link: string;       // Full URL to product page
    body: string;       // Detailed description from div.product-card__body
}
```

### Agrimetrics API
The integration with Agrimetrics uses their catalog API with the following parameters:
- Base URL: `https://app.agrimetrics.co.uk/backend/catalog/api/catalog/data-sets`
- Query Parameters:
  - `exchange=agrimetrics`: Specifies the data exchange
  - `tagRelationship=narrower`: Defines tag relationship type
  - `extendedText={search_term}`: The search query
  - `onlyFeatured=false`: Include all results
  - `onlyOwned=false`: Include all public datasets
  - `showHidden=false`: Exclude hidden datasets
  - `showEditable=false`: Exclude editable datasets
  - `identities=PUBLIC`: Show only public datasets
  - `offset=0`: Starting point for results
  - `limit=13`: Maximum number of results
  - `sort=relevance`: Sort by relevance

### data.gov.uk API
The integration with data.gov.uk uses their CKAN API with the following details:
- Base URL: `https://ckan.publishing.service.gov.uk/api/action/package_search`
- Method: GET
- Query Parameters:
  - `q`: The search query
- Response Format:
```typescript
interface DataGovUKDataset {
    id: string;
    title: string;
    notes: string;
    metadata_modified: string;
    organization: {
        title: string;
        description: string;
    };
    license_title: string;
    resources: Array<{
        url: string;
        format: string;
    }>;
}
```
- Response Handling:
  - Maps to common ListingResult format
  - Extracts organization information
  - Preserves license information
  - Includes resource URLs
  - Maintains update timestamps

## Usage

### Search Examples

1. Basic Search:
   ```
   https://proto-data-market-aggregator.chrisns.workers.dev/?search=soil
   ```

2. Multi-word Search:
   ```
   https://proto-data-market-aggregator.chrisns.workers.dev/?search=soil%20quality
   ```

### Response Format

The response is an HTML page containing interleaved results from all sources. Each result includes:
- Title
- Description
- Source information
- Provider details
- Last updated date (formatted consistently as DD/MM/YYYY HH:mm)
- Direct link to the data

## Development

### Prerequisites
- Node.js and npm
- Wrangler CLI for Cloudflare Workers
- Understanding of Cloudflare's caching mechanisms
- TypeScript knowledge

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Testing
Run the test suite:
```bash
npm test
```

The test suite includes:
- Unit tests for each data source integration
- Integration tests for the combined search functionality
- Error handling tests
- URL construction tests
- Response formatting tests
- Cache configuration tests

### Deployment
Deploy to Cloudflare Workers:
```bash
npm run deploy
```

### Performance Considerations
When developing new features or modifying existing ones:
- Maintain the parallel request architecture
- Utilize appropriate cache settings for new API integrations
- Consider cache implications when modifying API calls
- Test performance with and without cached responses
- Be mindful of aggressive caching when implementing new endpoints
- Consider cache bypass strategies for time-sensitive data
- Use appropriate cache keys for new data sources
- Ensure consistent date formatting across all sources
- Handle API timeouts gracefully

## Error Handling

The service implements graceful degradation:
- If any individual data source fails, other sources continue to function
- Parallel request architecture ensures a single slow API doesn't block other results
- Invalid search parameters are handled gracefully
- Network errors are caught and logged
- Empty results are handled appropriately
- Timeouts and connection issues are handled gracefully
- Caching provides resilience against temporary API failures
- All errors are logged for monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
