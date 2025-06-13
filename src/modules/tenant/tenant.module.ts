import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from 'modules/role/role.module';
import { TenantController } from 'modules/tenant/tenant.controller';
import { TenantService } from 'modules/tenant/tenant.service';
import { Tenant } from './entities/tenant.entity';

@Module({
    imports: [RoleModule, TypeOrmModule.forFeature([Tenant])],
    providers: [TenantService],
    controllers: [TenantController],
    exports: [TenantService],
})
export class TenantModule {}
