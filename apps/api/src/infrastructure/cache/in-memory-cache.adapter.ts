import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import NodeCache from "node-cache";

import type { ICacheProvider } from "@repo/shared-types";

@Injectable()
export class InMemoryCacheAdapter implements ICacheProvider {
  private readonly cache: NodeCache;

  constructor(private readonly config: ConfigService) {
    const defaultTtl = this.config.get<number>("LANDING_CACHE_TTL", 3600);
    this.cache = new NodeCache({ stdTTL: defaultTtl, checkperiod: 120 });
  }

  get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return Promise.resolve(value ?? null);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value, ttlSeconds ?? 0);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.cache.del(key);
    return Promise.resolve();
  }

  has(key: string): Promise<boolean> {
    return Promise.resolve(this.cache.has(key));
  }
}
