import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';

export class ListService {
  constructor(private sp: SPFI) {}

  public async getItems<T>(listTitle: string, filter?: string, select?: string[], orderBy?: string, top?: number): Promise<T[]> {
    let query = this.sp.web.lists.getByTitle(listTitle).items;
    if (select) query = query.select(...select);
    if (filter) query = query.filter(filter);
    if (orderBy) query = query.orderBy(orderBy);
    if (top) query = query.top(top);
    return query() as Promise<T[]>;
  }

  public async getItemById<T>(listTitle: string, id: number, select?: string[]): Promise<T> {
    let query = this.sp.web.lists.getByTitle(listTitle).items.getById(id);
    if (select) query = query.select(...select);
    return query() as Promise<T>;
  }

  public async addItem<T>(listTitle: string, properties: Record<string, unknown>): Promise<T> {
    const result = await this.sp.web.lists.getByTitle(listTitle).items.add(properties);
    return result as unknown as T;
  }

  public async updateItem(listTitle: string, id: number, properties: Record<string, unknown>): Promise<void> {
    await this.sp.web.lists.getByTitle(listTitle).items.getById(id).update(properties);
  }

  public async deleteItem(listTitle: string, id: number): Promise<void> {
    await this.sp.web.lists.getByTitle(listTitle).items.getById(id).delete();
  }

  public async ensureList(listTitle: string, description: string = ''): Promise<void> {
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
      // Field already exists
    }
  }

  public async ensureFieldOnLibrary(libraryServerRelativeUrl: string, fieldXml: string, fieldName?: string): Promise<void> {
    try {
      await this.sp.web.getList(libraryServerRelativeUrl).fields.createFieldAsXml(fieldXml);
    } catch {
      // Field already exists
    }
  }

  public async updateLibraryItem(libraryServerRelativeUrl: string, itemId: number, properties: Record<string, unknown>): Promise<void> {
    await this.sp.web.getList(libraryServerRelativeUrl).items.getById(itemId).update(properties);
  }

  public async getLibraryItemByUrl(libraryServerRelativeUrl: string, fileServerRelativeUrl: string): Promise<{ Id: number }> {
    const items = await this.sp.web.getList(libraryServerRelativeUrl).items
      .filter(`FileRef eq '${fileServerRelativeUrl}'`)
      .select('Id')
      .top(1)() as { Id: number }[];
    if (items.length === 0) {
      throw new Error(`Item not found for ${fileServerRelativeUrl}`);
    }
    return items[0];
  }
}
