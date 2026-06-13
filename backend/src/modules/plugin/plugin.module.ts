import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plugin } from './entities/plugin.entity';
import { PluginService } from './plugin.service';
import { PluginController } from './plugin.controller';
import { EventModule } from '../event/event.module';

@Module({
  imports: [TypeOrmModule.forFeature([Plugin]), EventModule],
  controllers: [PluginController],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
