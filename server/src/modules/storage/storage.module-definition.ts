import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface StorageModuleConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<StorageModuleConfig>()
    .setClassMethodName('forRoot')
    .build();
