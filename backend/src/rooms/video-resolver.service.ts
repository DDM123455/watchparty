import { Injectable } from '@nestjs/common';
import { ProviderRegistryService } from './providers/provider-registry.service';
import type { ResolvedVideo } from './providers/provider.interface';

export type { ResolvedVideo };

@Injectable()
export class VideoResolverService {
  constructor(private readonly registry: ProviderRegistryService) {}

  resolve(url: string): Promise<ResolvedVideo | null> {
    return this.registry.resolve(url);
  }
}
