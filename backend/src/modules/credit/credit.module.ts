import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditAccount, CreditTransaction, AdminSetting } from './entities/credit.entity';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CreditAccount, CreditTransaction, AdminSetting])],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
