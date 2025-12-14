import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';

if (!apiKey) {
  console.warn('Warning: OPENAI_API_KEY not found in environment variables');
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export const getOpenAIClient = () => {
  return openai;
};

export default openai;
