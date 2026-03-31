import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';

export class ListService {
  constructor(private sp: SPFI) {}

  public async getItems<T>(listTitle: string, filter?: string, select?: string[], orderBy?: string, top?: number): Promise<T[]> {
    let query = this.sp.web.lists.getByTitle(listTitle).items;

    if (select) {
      query = query.select(...select) as typeof query;
    }
    if (filter) {
      query = query.filter(filter) as typeof query;
    }
    if (orderBy) {
      query = query.orderBy(orderBy) as typeof query;
    }
    if (top) {
      query = query.top(top) as typeof query;
    }

    return query() as Promise<T[]>;
  }

  public async getItemById<T>(listTitle: string, id: number, select?: string[]): Promise<T> {
    let query = this.sp.web.lists.getByTitle(listTitle).items.getById(id);
    if (select) {
      query = query.select(...select) as typeof query;
    }
    return query() as Promise<T>;
  }

  public async addItem<T extends Record<string, unknown>>(listTitle: string, item: T): Promise<{ Id: number }> {
    const result = await this.sp.web.lists.getByTitle(listTitle).items.add(item);
    return { Id: result.Id };
  }

  public async updateItem<T extends Record<string, unknown>>(listTitle: string, id: number, item: T): Promise<void> {
    await this.sp.web.lists.getByTitle(listTitle).items.getById(id).update(item);
  }

  public async deleteItem(listTitle: string, id: number): Promise<void> {
    await this.sp.web.lists.getByTitle(listTitle).items.getById(id).delete();
  }

  public async ensureList(listTitle: string, description: string): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(listTitle)();
    } catch {
      await this.sp.web.lists.add(listTitle, description, 100, false);
    }
  }

  public async ensureField(listTitle: string, fieldXml: string): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(listTitle).fields.createFieldAsXml(fieldXml);
    } catch {
      // Field likely already exists — safe to ignore
    }
  }
}
