# Data Marketplace Aggregator

[![Security Scanning](https://github.com/chrisns/proto-data-market-aggregator/actions/workflows/security.yml/badge.svg)](https://github.com/chrisns/proto-data-market-aggregator/actions/workflows/security.yml) ![GitHub License](https://img.shields.io/github/license/chrisns/proto-data-market-aggregator) ![GitHub language count](https://img.shields.io/github/languages/count/chrisns/proto-data-market-aggregator) ![GitHub top language](https://img.shields.io/github/languages/top/chrisns/proto-data-market-aggregator)

🔗 **Live Demo**: [https://proto-data-market-aggregator.chrisns.workers.dev/](https://proto-data-market-aggregator.chrisns.workers.dev/)

A Cloudflare Worker that aggregates and searches across multiple data sources including Snowflake, Databricks, ONS, Defra, and Agrimetrics. This service provides a unified search interface for government and commercial data marketplaces.

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
