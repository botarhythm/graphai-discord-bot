/**
 * ウェブ検索エージェント
 * Gemini APIを使用してウェブ検索を実行します
 */

interface Agent {
  name: string;
  process(input: any): Promise<any>;
}

import fetch from 'node-fetch';

class WebSearchAgent implements Agent {
  name = 'WebSearchAgent';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY is not set. Web search functionality will not work.');
    }
  }

  async process(query: string): Promise<{ results: any[]; error?: string }> {
    if (!this.apiKey) {
      return {
        results: [],
        error: 'API key not configured'
      };
    }

    if (!query || query.trim().length === 0) {
      return {
        results: [],
        error: 'Empty search query'
      };
    }

    try {
      // Gemini Web Search APIのエンドポイント
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
      
      // リクエストボディの構築
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `Search the web for: ${query}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      // API呼び出し
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Search API error: ${response.status} ${response.statusText}`, errorText);
        return {
          results: [],
          error: `Search API error: ${response.status}`
        };
      }

      const data = await response.json() as any;
      
      // 検索結果の抽出
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const searchResults = data.candidates[0].content.parts[0].text;
        return {
          results: [{ content: searchResults }]
        };
      } else {
        return {
          results: [],
          error: 'No search results found'
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export default new WebSearchAgent();
