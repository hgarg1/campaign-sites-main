import axios, { AxiosInstance } from 'axios';

export interface ActBlueConfig {
  apiKey: string;
  entityId: string;
}

export interface ActBlueDonation {
  amount: number;
  donor: {
    firstName: string;
    lastName: string;
    email: string;
  };
  timestamp: Date;
}

export class ActBlueIntegration {
  private client: AxiosInstance;

  constructor(private config: ActBlueConfig) {
    this.client = axios.create({
      baseURL: 'https://secure.actblue.com/api/v1',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createDonationForm(params: {
    amount?: number;
    recurring?: boolean;
    customFields?: Record<string, any>;
  }) {
    const response = await this.client.post('/forms', {
      entity_id: this.config.entityId,
      ...params,
    });
    return response.data;
  }

  async getDonations(startDate: Date, endDate: Date): Promise<ActBlueDonation[]> {
    const response = await this.client.get('/contributions', {
      params: {
        entity_id: this.config.entityId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data.contributions;
  }

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    // Implement webhook verification logic
    return true;
  }
}
