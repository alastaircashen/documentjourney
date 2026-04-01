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
      query = query.select(...select);
    }
    if (filter) {
      query = query.filter(filter);
    }
    if (orderBy) {
      query = query.orderBy(orderBy);
    }
    if (top) {
      query = query.top(top);
    }

    return query() as Promise<T[]>;
  }

  public async getItemById<T>(listTitle: string, id: number, select?: string[]): Promise<T> {
    let query = this.sp.web.lists.getByTitle(listTitle).items.getById(id);
    if (select) {
      query = query.select(...select);
    }
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
      // Field already exists, ignore
    }
  }

  public async ensureFieldOnLibrary(libraryServerRelativeUrl: string, fieldXml: string, internalName?: string): Promise<void> {
    const list = this.sp.web.getList(libraryServerRelativeUrl);

    // Check if field already exists by internal name
    if (internalName) {
      try {
        const existing: any = await list.fields.getByInternalNameOrTitle(internalName)();
        // Field exists — ensure the field customizer is bound
        if (!existing.ClientSideComponentId) {
          await list.fields.getByInternalNameOrTitle(internalName).update({
            ClientSideComponentId: 'a1b2c3d4-5678-4def-9abc-def012345678'
          } as any);
        }
        return;
      } catch {
        // Doesn't exist — fall through to create
      }
    }

    // Use addText for reliable internal name, then rename the display title
    // and wire up the field customizer so it renders as a styled badge
    try {
      await list.fields.addText(internalName || 'DJStatus', { Group: 'Document Journey' });
      await list.fields.getByInternalNameOrTitle(internalName || 'DJStatus').update({
        Title: 'Journey Status',
        Description: 'Document Journey tracking status',
        ClientSideComponentId: 'a1b2c3d4-5678-4def-9abc-def012345678'
      });
    } catch (err) {
      console.warn('Failed to create DJStatus field on library:', err);
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
