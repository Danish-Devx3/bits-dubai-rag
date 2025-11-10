import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { seedDatabase } from './seeder';

@Module({
  imports: [PrismaModule],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Seed database on startup
    try {
      await seedDatabase(this.prisma);
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
}

