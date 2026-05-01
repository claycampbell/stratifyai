import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';

if (!apiKey) {
  console.warn('Warning: No AI API key found. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
}

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'https://stratifyai.com',
    'X-Title': 'StratifyAI',
  },
});

export const getOpenAIClient = () => {
  return openai;
};

export default openai;
