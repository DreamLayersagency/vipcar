import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DeliveryService } from './delivery.service';

@Injectable()
export class DeliveryWorker {
  private readonly logger = new Logger(DeliveryWorker.name);
  private running = false;

  constructor(private readonly delivery: DeliveryService) {}

  @Interval(15_000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const n = await this.delivery.processDue();
      if (n > 0) {
        this.logger.debug(`Retried ${n} due delivery(ies)`);
      }
    } catch (error: unknown) {
      this.logger.error(
        'Delivery worker tick failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
