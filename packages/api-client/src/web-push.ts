import { http, type HttpResponse } from './http';

export interface WebPushRegistration {
  id: string;
  userId: string;
}

export const webPushApi = {
  async configuration(): Promise<{ enabled: boolean; publicKey: string | null }> {
    return (
      await http<HttpResponse<{ enabled: boolean; publicKey: string | null }>>('/notifications/web-push')
    ).data;
  },
  async register(subscription: PushSubscriptionJSON): Promise<WebPushRegistration> {
    return (
      await http<HttpResponse<WebPushRegistration>>('/notifications/web-push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    ).data;
  },
  async remove(endpoint: string): Promise<void> {
    await http('/notifications/web-push', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  },
};
