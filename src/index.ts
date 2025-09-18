import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database';
import { TransactionModel } from './models/Transaction';
import { BotService } from './services/BotService';
import { logger } from './utils/logger';

dotenv.config();

async function main(): Promise<void> {
  logger.info('Starting Automation Bot...');

  try {
    logger.info('Initialize DB connection');
    const dbConfig = new DatabaseConfig(
      process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017',
      process.env.DB_NAME || 'banking_bot',
    );
    const transactionModel = new TransactionModel(await dbConfig.getDb());
    const botService = new BotService(transactionModel);

    logger.info('DB initialized successfully');

    const accounts = BotService.getAccounts();
    logger.info(`Loaded ${accounts.length} accounts for processing`);

    logger.info('Handle crawling data...');
    const results = await botService.processAccountsConcurrently(accounts);

    // Result log
    logger.info(`Total accounts processed: ${results.totalAccounts}`);
    logger.info(`Successful accounts: ${results.successfulAccounts}`);
    logger.info(`Failed accounts: ${results.failedAccounts}`);
    logger.info(`Total transactions saved: ${results.totalTransactions}`);

    results.results.forEach(result => {
      if (result.success) {
        logger.info(`${result.username}: ${result.transactionCount} transactions`);
      } else {
        logger.error(`${result.username}: ${result.error}`);
      }
    });

    logger.info('Bot execution completed successfully');

    await dbConfig.disconnect();
  } catch (error) {
    logger.error('Bot execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main:', error);
    process.exit(1);
  });
}
