export interface BankAccount {
  username: string;
  password: string;
}

export interface Transaction {
  username: string;
  tx_date: Date;
  description: string;
  amount: number;
  scraped_at: Date;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  cookies?: string[];
  errorMessage?: string;
}

export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
}
