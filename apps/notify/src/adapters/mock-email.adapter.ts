import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationAdapter,
  SendMessageInput,
  SendMessageResult,
} from './notification.adapter';

/**
 * Mock / manual email adapter.
 * Logs subject + body. Swap for SMTP/API provider later.
 */
@Injectable()
export class MockEmailAdapter implements NotificationAdapter {
  readonly channel = 'email' as const;
  private readonly logger = new Logger(MockEmailAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (this.shouldFail()) {
      throw new Error('Mock email forced failure (NOTIFY_MOCK_FAIL)');
    }

    this.logger.log(
      `[mock email] to=${input.to} subject=${input.subject ?? '(none)'} template=${input.template}`,
    );
    this.logger.debug(input.body);
    return { ok: true, providerMessageId: `mock-email-${Date.now()}` };
  }

  private shouldFail(): boolean {
    const fail = this.config.get<string>('NOTIFY_MOCK_FAIL', '');
    return fail.split(',').map((s) => s.trim()).includes('email');
  }
}
