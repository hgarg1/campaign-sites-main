import axios, { AxiosInstance } from 'axios';

export interface HubSpotConfig {
  apiKey: string;
}

export class HubSpotIntegration {
  private client: AxiosInstance;

  constructor(private config: HubSpotConfig) {
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createContact(contact: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    properties?: Record<string, any>;
  }) {
    const response = await this.client.post('/crm/v3/objects/contacts', {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        phone: contact.phone,
        ...contact.properties,
      },
    });
    return response.data;
  }

  async addToList(contactId: string, listId: string) {
    const response = await this.client.post(
      `/contacts/v1/lists/${listId}/add`,
      {
        vids: [contactId],
      }
    );
    return response.data;
  }

  async createForm(form: {
    name: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
    }>;
  }) {
    const response = await this.client.post('/marketing/v3/forms', form);
    return response.data;
  }

  async submitForm(formId: string, data: Record<string, any>) {
    const response = await this.client.post(
      `/submissions/v3/integration/submit/${formId}`,
      {
        fields: Object.entries(data).map(([name, value]) => ({
          name,
          value,
        })),
      }
    );
    return response.data;
  }
}
