import { Collection, Db } from 'mongodb';
import { Transaction } from '@/types';
import { logger } from '@/utils/logger';

export class TransactionModel {
  private collection: Collection<Transaction>;

  constructor(db: Db) {
    this.collection = db.collection<Transaction>('transactions');
  }

  async insertMany(transactions: Transaction[]): Promise<void> {
    try {
      if (transactions.length === 0) return;

      const result = await this.collection.insertMany(transactions);
      logger.info(`Inserted ${result.insertedCount} transactions`);
    } catch (error) {
      logger.error('Failed to insert transactions:', error);
      throw error;
    }
  }
}
