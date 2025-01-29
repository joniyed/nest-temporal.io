import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NativeConnection, Worker } from '@temporalio/worker';
import { getTemporalConnectionOptions } from './temporal.config';
import { ActivityTypes, EmailActivities } from './activities';

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;
  private connection: NativeConnection | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailActivities: EmailActivities,
  ) {
  }

  async onModuleInit() {
    console.log('🚀 Temporal Worker is starting...');

    this.connection = await NativeConnection.connect(
      getTemporalConnectionOptions(this.configService),
    );

    const activitiesImplementation: ActivityTypes = {
      sendEmail: (email: string) => this.emailActivities.sendEmail(email),
    };

    this.worker = await Worker.create({
      connection: this.connection,
      namespace: 'default',
      taskQueue: 'email-queue',
      workflowsPath: require.resolve('./workflows'),
      activities: activitiesImplementation,
    });

    console.log('✅ Temporal Worker started.');

    // Graceful shutdown on process exit
    process.on('SIGTERM', this.shutdown.bind(this));

    // 🚀 Run in background without blocking NestJS lifecycle
    this.worker.run().catch((err) => {
      console.error('❌ Temporal Worker encountered an error:', err);
      this.shutdown();
    });
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async shutdown() {
    console.log('🛑 Shutting down Temporal Worker...');
    if (this.worker) {
      await this.worker.shutdown();
    }
    if (this.connection) {
      await this.connection.close();
    }
    console.log('✅ Temporal Worker shutdown complete.');
  }
}
