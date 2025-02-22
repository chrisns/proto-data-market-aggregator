import { describe, it, expect } from 'vitest'
import { getCacheControlHeader, interweaveResults } from '../src/index'

describe('Utility Functions', () => {
  describe('getCacheControlHeader', () => {
    it('should return correct cache control string', () => {
      const header = getCacheControlHeader()
      expect(header).toBe('public, max-age=1209600, stale-while-revalidate=86400')
    })

    it('should include max-age of 2 weeks', () => {
      const header = getCacheControlHeader()
      expect(header).toContain('max-age=1209600') // 2 weeks in seconds
    })

    it('should include stale-while-revalidate of 1 day', () => {
      const header = getCacheControlHeader()
      expect(header).toContain('stale-while-revalidate=86400') // 1 day in seconds
    })
  })

  describe('interweaveResults', () => {
    it('should correctly interweave results from multiple sources', () => {
      const source1Results = [
        { source: 'source1', title: 'title1', url: 'url1', description: 'desc1', date: new Date() },
        { source: 'source1', title: 'title2', url: 'url2', description: 'desc2', date: new Date() }
      ]
      const source2Results = [
        { source: 'source2', title: 'title3', url: 'url3', description: 'desc3', date: new Date() },
        { source: 'source2', title: 'title4', url: 'url4', description: 'desc4', date: new Date() }
      ]

      const results = interweaveResults([...source1Results, ...source2Results])

      expect(results).toHaveLength(4)
      expect(results[0].source).toBe('source1')
      expect(results[1].source).toBe('source2')
      expect(results[2].source).toBe('source1')
      expect(results[3].source).toBe('source2')
    })

    it('should handle empty arrays', () => {
      const results = interweaveResults([])
      expect(results).toHaveLength(0)
    })

    it('should handle single source', () => {
      const sourceResults = [
        { source: 'source1', title: 'title1', url: 'url1', description: 'desc1', date: new Date() },
        { source: 'source1', title: 'title2', url: 'url2', description: 'desc2', date: new Date() }
      ]

      const results = interweaveResults(sourceResults)

      expect(results).toHaveLength(2)
      expect(results).toEqual(sourceResults)
    })

    it('should handle uneven result counts', () => {
      const source1Results = [
        { source: 'source1', title: 'title1', url: 'url1', description: 'desc1', date: new Date() },
        { source: 'source1', title: 'title2', url: 'url2', description: 'desc2', date: new Date() }
      ]
      const source2Results = [
        { source: 'source2', title: 'title3', url: 'url3', description: 'desc3', date: new Date() }
      ]

      const results = interweaveResults([...source1Results, ...source2Results])

      expect(results).toHaveLength(3)
      expect(results[0].source).toBe('source1')
      expect(results[1].source).toBe('source2')
      expect(results[2].source).toBe('source1')
    })

    it('should maintain source order with multiple sources', () => {
      const source1Results = [
        { source: 'source1', title: 'title1', url: 'url1', description: 'desc1', date: new Date() }
      ]
      const source2Results = [
        { source: 'source2', title: 'title2', url: 'url2', description: 'desc2', date: new Date() }
      ]
      const source3Results = [
        { source: 'source3', title: 'title3', url: 'url3', description: 'desc3', date: new Date() }
      ]

      const results = interweaveResults([...source1Results, ...source2Results, ...source3Results])

      expect(results).toHaveLength(3)
      expect(results[0].source).toBe('source1')
      expect(results[1].source).toBe('source2')
      expect(results[2].source).toBe('source3')
    })
  })
}) 