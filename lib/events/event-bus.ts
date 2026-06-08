export type EventType = "MEDIA_UPLOADED" | "SKELETON_TRACKED" | "METRIC_INGESTED" | "CLUSTER_COMPUTED" | "TWIN_UPDATED";

export interface DomainEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: string;
}

type EventHandler = (event: DomainEvent) => Promise<void> | void;

class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();

  subscribe(type: EventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}

export const globalEventBus = new EventBus();
