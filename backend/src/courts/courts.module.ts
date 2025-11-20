import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { GooglePlacesService } from './services/google-places.service';
import { Court } from '../entities/court.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, User])],
  controllers: [CourtsController],
  providers: [CourtsService, GooglePlacesService],
  exports: [CourtsService],
})
export class CourtsModule {}

