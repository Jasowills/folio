import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigurableModuleClass } from './storage.module-definition';

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule extends ConfigurableModuleClass {}
