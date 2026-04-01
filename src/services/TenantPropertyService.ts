import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';

export class TenantPropertyService {
  private cache: Map<string, string> = new Map();

  constructor(private sp: SPFI) {}

  public async getValue(key: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const result = await (this.sp.web as any).getStorageEntity(key);
      const value = result?.Value || '';
      this.cache.set(key, value);
      return value;
    } catch {
      this.cache.set(key, '');
      return '';
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
