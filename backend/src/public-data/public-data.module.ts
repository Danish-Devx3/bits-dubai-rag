import { Module } from '@nestjs/common';
import { PublicDataController } from './public-data.controller';
import { PublicDataService } from './public-data.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicDataController],
  providers: [PublicDataService],
  exports: [PublicDataService],
})
export class PublicDataModule {}

