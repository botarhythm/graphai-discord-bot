/**
 * Brave Search API
 * ウェブ検索機能を提供するユーティリティ
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

interface SearchOptions {
  count?: number;
  offset?: number;
  safe?: boolean;
  country?: string;
  language?: string;
}

interface SearchResult {
  title: string;
  link: string;
  description: string;
}

/**
 * Brave Search APIを使用してウェブ検索を実行
 * @param query - 検索クエリ
 * @param options - 検索オプション
 * @returns 検索結果配列
 */
export async function brave_web_search(
  query: string, 
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    count = 5,
    offset = 0,
    safe = true,
    country = 'JP',  // 日本の検索結果を優先
    language = 'ja'  // 日本語の検索結果を優先
  } = options;

  if (!query || typeof query !== 'string' || query.trim() === '') {
    console.log('Invalid or empty search query');
    return [];
  }

  console.log(`Brave Search API querying: "${query}"`);

  try {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      console.error('BRAVE_API_KEY is not set in environment variables');
      throw new Error('API キーが設定されていません');
    }

    // Brave Search APIにリクエスト
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&offset=${offset}&country=${country}&language=${language}`, 
      {
        method: 'GET',
        headers: {
          'X-Subscription-Token': apiKey,
          'Accept': 'application/json',
          'Accept-Language': 'ja'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Brave API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`検索API エラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (!data.web || !data.web.results) {
      console.log('No search results found or invalid response format');
      return [];
    }

    console.log(`Received ${data.web.results.length} raw search results, returning up to ${count}`);

    return data.web.results
      .map((result: any) => ({
        title: result.title,
        link: result.url,
        description: result.description
      }))
      .slice(0, count);

  } catch (error) {
    console.error('Brave検索エラー:', error);
    throw error;
  }
}

export default {
  brave_web_search
};