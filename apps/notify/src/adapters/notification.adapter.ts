export type SendMessageInput = {
  to: string;
  subject?: string;
  body: string;
  template: string;
  locale: string;
};

export type SendMessageResult = {
  ok: true;
  providerMessageId?: string;
};

export interface NotificationAdapter {
  readonly channel: 'whatsapp' | 'email';
  send(input: SendMessageInput): Promise<SendMessageResult>;
}
