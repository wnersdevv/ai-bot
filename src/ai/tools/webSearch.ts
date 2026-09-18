import axios from 'axios';
import { ToolDefinition, ToolError } from '../types';

interface WebSearchArgs {
  query: string;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Web search tool. Requires WEB_SEARCH_API_URL + WEB_SEARCH_API_KEY env vars
 * pointing at a search API of the operator's choice (e.g. Bing/SerpAPI/Brave
 * Search) - WNERSAI does not bundle or bypass any particular provider's
 * terms of service, and there is no scraping fallback.
 */
export const webSearchTool: ToolDefinition<WebSearchArgs, { results: WebSearchResultItem[] }> = {
  name: 'web-search',
  description: 'Searches the web for a query and returns a short list of results',
  timeoutMs: 8_000,
  rateLimitPerMinute: 10,
  validate: (args: unknown) => {
    if (typeof args !== 'object' || args === null || typeof (args as any).query !== 'string') {
      throw new ToolError('web-search requires a string "query" argument', 'validation');
    }
    const query = (args as any).query as string;
    if (!query.trim() || query.length > 300) {
      throw new ToolError('query must be non-empty and under 300 characters', 'validation');
    }
    return { query };
  },
  execute: async ({ query }) => {
    const apiUrl = process.env.WEB_SEARCH_API_URL;
    const apiKey = process.env.WEB_SEARCH_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new ToolError('Web search is not configured on this deployment (WEB_SEARCH_API_URL/KEY missing)', 'execution');
    }

    try {
      const res = await axios.get(apiUrl, {
        params: { q: query },
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 6_000,
      });
      const results: WebSearchResultItem[] = (res.data.results ?? [])
        .slice(0, 5)
        .map((r: any) => ({ title: r.title ?? '', url: r.url ?? '', snippet: r.snippet ?? '' }));
      return { results };
    } catch (err) {
      throw new ToolError(`Web search failed: ${(err as Error).message}`, 'execution');
    }
  },
};
