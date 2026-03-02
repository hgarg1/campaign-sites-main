import axios, { AxiosInstance } from 'axios';

export interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  instanceUrl: string;
  accessToken?: string;
}

export class SalesforceIntegration {
  private client: AxiosInstance;
  private accessToken?: string;

  constructor(private config: SalesforceConfig) {
    this.accessToken = config.accessToken;
    this.client = axios.create({
      baseURL: `${config.instanceUrl}/services/data/v57.0`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    }
  }

  async authenticate(username: string, password: string) {
    const response = await axios.post(
      `${this.config.instanceUrl}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username,
        password,
      })
    );

    this.accessToken = response.data.access_token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    return this.accessToken;
  }

  async createContact(contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }) {
    const response = await this.client.post('/sobjects/Contact', {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Phone: contact.phone,
    });
    return response.data;
  }

  async createCampaignMember(contactId: string, campaignId: string) {
    const response = await this.client.post('/sobjects/CampaignMember', {
      ContactId: contactId,
      CampaignId: campaignId,
      Status: 'Sent',
    });
    return response.data;
  }

  async query(soql: string) {
    const response = await this.client.get('/query', {
      params: { q: soql },
    });
    return response.data;
  }
}
