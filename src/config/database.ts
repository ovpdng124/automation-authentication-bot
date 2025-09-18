import { MongoClient, Db } from 'mongodb';
import { logger } from '@/utils/logger';

export class DatabaseConfig {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(private connectionString: string, private dbName: string) {}

  private async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.connectionString);

      await this.client.connect();

      this.db = this.client.db(this.dbName);

      logger.info('Connected to MongoDB successfully');
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      logger.info('Disconnected from MongoDB');
    }
  }

  async getDb(): Promise<Db> {
    if (!this.db) {
      await this.connect();
    }

    return this.db!;
  }
}
