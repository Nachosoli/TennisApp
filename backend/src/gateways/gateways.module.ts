import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MatchUpdatesGateway } from './match-updates.gateway';
import { NotificationsGateway } from './notifications.gateway';
import jwtConfig from '../config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [jwtConfig],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwt = configService.get('jwt');
        return {
          secret: jwt.accessSecret,
          signOptions: { expiresIn: jwt.accessExpiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MatchUpdatesGateway, NotificationsGateway],
  exports: [MatchUpdatesGateway, NotificationsGateway],
})
export class GatewaysModule {}

