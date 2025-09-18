import axios, { AxiosInstance } from 'axios';

export function createHttpClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.API_URL || '',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
}
