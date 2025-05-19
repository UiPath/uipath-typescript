import WebSocket from 'ws';
import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

export interface SyncOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface EntityUpdate<T> {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: T;
  timestamp: number;
}

export class SyncManager {
  private ws: WebSocket | null = null;
  private eventEmitter: EventEmitter;
  private reconnectAttempts = 0;
  private readonly options: Required<SyncOptions>;
  private entitySubscriptions: Set<string> = new Set();

  constructor(options: SyncOptions) {
    this.options = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      ...options
    };
    this.eventEmitter = new EventEmitter();
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.options.url);
    
    this.ws.on('open', () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;
      this.resubscribeEntities();
    });

    this.ws.on('message', (data: string) => {
      try {
        const update = JSON.parse(data) as EntityUpdate<unknown>;
        this.eventEmitter.emit(`${update.entity}:update`, update);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
      this.handleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleReconnect();
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.options.reconnectInterval);
  }

  private resubscribeEntities(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.entitySubscriptions.forEach(entity => {
      this.ws!.send(JSON.stringify({
        type: 'SUBSCRIBE',
        entity,
        id: uuidv4()
      }));
    });
  }

  public subscribe<T>(entity: string, callback: (update: EntityUpdate<T>) => void): () => void {
    this.entitySubscriptions.add(entity);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        entity,
        id: uuidv4()
      }));
    }

    this.eventEmitter.on(`${entity}:update`, callback);
    
    return () => {
      this.entitySubscriptions.delete(entity);
      this.eventEmitter.off(`${entity}:update`, callback);
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'UNSUBSCRIBE',
          entity,
          id: uuidv4()
        }));
      }
    };
  }

  public async sendUpdate<T>(entity: string, update: Omit<EntityUpdate<T>, 'timestamp'>): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not established');
    }

    const fullUpdate: EntityUpdate<T> = {
      ...update,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(fullUpdate));
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventEmitter.removeAllListeners();
    this.entitySubscriptions.clear();
  }
} 