import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

// Feature modules (auth, merchants, locations, rates, quotes, couriers, orders, shipments, tracking, risk,
// payouts, billing, notifications, ai, seo, admin) are added milestone by milestone — see ../AGENTS.md §7.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
