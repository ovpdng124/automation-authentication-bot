import { AuthService } from './AuthService';
import { TransactionService } from './TransactionService';
import { BankAccount } from '@/types';
import { TransactionModel } from '@/models/Transaction';
import { logger } from '@/utils/logger';

export class BotService {
  private authService: AuthService;
  private transactionService: TransactionService;
  private transactionModel: TransactionModel;

  constructor(transactionModel: TransactionModel) {
    this.authService = new AuthService();
    this.transactionService = new TransactionService();
    this.transactionModel = transactionModel;
  }

  private async processAccount(account: BankAccount): Promise<{
    success: boolean;
    username: string;
    transactionCount: number;
    error?: string;
  }> {
    try {
      logger.info(`Starting processing for account: ${account.username}`);
      const token = await this.getToken(account);

      if (!token) {
        return {
          success: false,
          username: account.username,
          transactionCount: 0,
          error: 'Login failed',
        };
      }

      // Fetch transactions
      const transactions = await this.transactionService.getTransactions(
        account.username,
        token,
      );

      if (transactions.length === 0) {
        logger.warn(`No transactions found for ${account.username}`);

        return {
          success: true,
          username: account.username,
          transactionCount: 0,
        };
      }

      // Store DB
      await this.transactionModel.insertMany(transactions);

      logger.info(`Successfully processed ${account.username}: ${transactions.length} transactions saved`);

      return {
        success: true,
        username: account.username,
        transactionCount: transactions.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing account ${account.username}:`, errorMessage);

      return {
        success: false,
        username: account.username,
        transactionCount: 0,
        error: errorMessage,
      };
    }
  }

  private async getToken(account: BankAccount): Promise<string | null> {
    const credentials = await this.authService.login(account);

    if (credentials.success && credentials.token) {
      return credentials.token;
    }

    logger.error(`${account.username}: Login failed - ${credentials.errorMessage}`);
    return null;
  }

  async processAccountsConcurrently(accounts: BankAccount[]): Promise<{
    totalAccounts: number;
    successfulAccounts: number;
    failedAccounts: number;
    totalTransactions: number;
    results: Array<{
      success: boolean;
      username: string;
      transactionCount: number;
      error?: string;
    }>;
  }> {
    logger.info(`Starting concurrent processing of ${accounts.length} accounts`);

    const results = await Promise.allSettled(
      accounts.map(account => this.processAccount(account)),
    );

    const processedResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error('Promise rejected:', result.reason);
        return {
          success: false,
          username: 'unknown',
          transactionCount: 0,
          error: result.reason?.message || 'Promise rejected',
        };
      }
    });

    const summary = {
      totalAccounts: accounts.length,
      successfulAccounts: processedResults.filter(r => r.success).length,
      failedAccounts: processedResults.filter(r => !r.success).length,
      totalTransactions: processedResults.reduce((sum, r) => sum + r.transactionCount, 0),
      results: processedResults,
    };

    logger.info(`Processing complete: ${summary.successfulAccounts}/${summary.totalAccounts} accounts successful, ${summary.totalTransactions} total transactions`);

    return summary;
  }

  static getAccounts(): BankAccount[] {
    const accountsStr = process.env.BANK_ACCOUNTS || '';

    if (!accountsStr) {
      throw new Error('BANK_ACCOUNTS environment variable not set');
    }

    const accounts: BankAccount[] = [];
    const accountPairs = accountsStr.split(',');

    for (const pair of accountPairs) {
      const [username, password] = pair.trim().split(':');

      if (!username || !password) {
        logger.warn(`Invalid account format: ${pair}`);
        continue;
      }

      accounts.push({ username: username.trim(), password: password.trim() });
    }

    if (accounts.length === 0) {
      throw new Error('No valid accounts found in BANK_ACCOUNTS');
    }

    logger.info(`Received ${accounts.length} accounts from environment`);
    return accounts;
  }
}
