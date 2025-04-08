import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

export async function brave_web_search(query, options = {}) {
  const {
    count = 5,
    offset = 0,
    safe = true,
    country = 'US',
    language = 'en'
  } = options;

  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': process.env.BRAVE_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Brave検索APIエラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data.web.results.map(result => ({
      title: result.title,
      link: result.url,
      description: result.description
    })).slice(0, count);

  } catch (error) {
    console.error('Brave検索エラー:', error);
    throw error;
  }
}