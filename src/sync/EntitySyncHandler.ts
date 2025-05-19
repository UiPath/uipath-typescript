import { SyncManager, EntityUpdate } from './SyncManager';

export interface EntityState<T> {
  items: T[];
  lastUpdate: number;
}

export abstract class EntitySyncHandler<T> {
  protected state: EntityState<T> = {
    items: [],
    lastUpdate: 0
  };

  private unsubscribe: (() => void) | null = null;

  constructor(
    protected readonly syncManager: SyncManager,
    protected readonly entityName: string
  ) {}

  public subscribe(onUpdate: (state: EntityState<T>) => void): () => void {
    // Unsubscribe from any existing subscription
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = this.syncManager.subscribe<T>(this.entityName, (update) => {
      this.handleUpdate(update);
      onUpdate(this.state);
    });

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  protected abstract getEntityId(item: T): string | number;

  protected handleUpdate(update: EntityUpdate<T>): void {
    const { type, data, timestamp } = update;

    switch (type) {
      case 'CREATE':
        this.state.items.push(data);
        break;

      case 'UPDATE': {
        const index = this.state.items.findIndex(
          item => this.getEntityId(item) === this.getEntityId(data)
        );
        if (index !== -1) {
          this.state.items[index] = data;
        }
        break;
      }

      case 'DELETE': {
        this.state.items = this.state.items.filter(
          item => this.getEntityId(item) !== this.getEntityId(data)
        );
        break;
      }
    }

    this.state.lastUpdate = timestamp;
  }

  public async create(data: T): Promise<void> {
    await this.syncManager.sendUpdate<T>(this.entityName, {
      type: 'CREATE',
      entity: this.entityName,
      data
    });
  }

  public async update(data: T): Promise<void> {
    await this.syncManager.sendUpdate<T>(this.entityName, {
      type: 'UPDATE',
      entity: this.entityName,
      data
    });
  }

  public async delete(data: T): Promise<void> {
    await this.syncManager.sendUpdate<T>(this.entityName, {
      type: 'DELETE',
      entity: this.entityName,
      data
    });
  }

  public getState(): EntityState<T> {
    return this.state;
  }
} 