import axios, { AxiosInstance } from 'axios';

export interface AnedotConfig {
  apiKey: string;
  campaignId: string;
}

export class AnedotIntegration {
  private client: AxiosInstance;

  constructor(private config: AnedotConfig) {
    this.client = axios.create({
      baseURL: 'https://api.anedot.com/v2',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async createDonationPage(params: {
    title: string;
    goalAmount?: number;
    customization?: Record<string, any>;
  }) {
    const response = await this.client.post('/pages', {
      campaign_id: this.config.campaignId,
      ...params,
    });
    return response.data;
  }

  async getDonations(limit = 100, offset = 0) {
    const response = await this.client.get('/transactions', {
      params: {
        campaign_id: this.config.campaignId,
        limit,
        offset,
      },
    });
    return response.data;
  }
}
