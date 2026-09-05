import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationAdapter,
  SendMessageInput,
  SendMessageResult,
} from './notification.adapter';

/**
 * Mock / manual WhatsApp adapter.
 * Logs a wa.me deep link and message body. Swap for a real provider later.
 */
@Injectable()
export class MockWhatsAppAdapter implements NotificationAdapter {
  readonly channel = 'whatsapp' as const;
  private readonly logger = new Logger(MockWhatsAppAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (this.shouldFail()) {
      throw new Error('Mock WhatsApp forced failure (NOTIFY_MOCK_FAIL)');
    }

    const digits = input.to.replace(/\D/g, '');
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(input.body)}`;
    this.logger.log(
      `[mock whatsapp] to=${input.to} template=${input.template} url=${waUrl}`,
    );
    this.logger.debug(input.body);
    return { ok: true, providerMessageId: `mock-wa-${Date.now()}` };
  }

  private shouldFail(): boolean {
    const fail = this.config.get<string>('NOTIFY_MOCK_FAIL', '');
    return fail.split(',').map((s) => s.trim()).includes('whatsapp');
  }
}
