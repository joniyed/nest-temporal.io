import { ConfigService } from '@nestjs/config';

export const getTemporalConnectionOptions = (configService: ConfigService) => ({
  address: configService.get('TEMPORAL_SERVER_ADDRESS', 'localhost:7233'),
});