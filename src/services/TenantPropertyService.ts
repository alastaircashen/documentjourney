import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import { TENANT_PROPERTY_KEYS } from '../constants';

interface IStorageEntity {
  Value: string | null;
}

export class TenantPropertyService {
  private cache: Map<string, string | null> = new Map();

  constructor(private sp: SPFI) {}

  public async get(key: string): Promise<string | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      const entity: IStorageEntity = await (this.sp.web as any).getStorageEntity(key);
      const value = entity?.Value || null;
      this.cache.set(key, value);
      return value;
    } catch {
      this.cache.set(key, null);
      return null;
    }
  }

  public async getGallerySiteUrl(): Promise<string | null> {
    return this.get(TENANT_PROPERTY_KEYS.GallerySiteUrl);
  }

  public async getFlowUrl(stepType: string): Promise<string | null> {
    const keyMap: Record<string, string> = {
      Notification: TENANT_PROPERTY_KEYS.FlowUrlNotification,
      Approval: TENANT_PROPERTY_KEYS.FlowUrlApproval,
      Signature: TENANT_PROPERTY_KEYS.FlowUrlSignature,
      Task: TENANT_PROPERTY_KEYS.FlowUrlTask,
      Feedback: TENANT_PROPERTY_KEYS.FlowUrlFeedback,
    };
    const key = keyMap[stepType];
    return key ? this.get(key) : null;
  }
}
