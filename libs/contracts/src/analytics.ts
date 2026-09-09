/**
 * GA / analytics event names kept in sync with the public web app (F-17).
 * Server-side emitters use the same names so logs and future pipelines stay compatible.
 */
export const ANALYTICS_EVENTS = {
  pageView: 'page_view',
  phoneClick: 'phone_click',
  whatsappClick: 'whatsapp_click',
  emailClick: 'email_click',
  serviceSelected: 'service_selected',
  quoteSubmit: 'quote_submit',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
