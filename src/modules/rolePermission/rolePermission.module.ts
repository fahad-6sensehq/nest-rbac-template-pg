import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionController } from 'modules/rolePermission/rolePermission.controller';
import { RolePermission } from './entities/rolePermission.entity';
import { RolePermissionService } from './rolePermission.service';

@Module({
    imports: [TypeOrmModule.forFeature([RolePermission])],
    controllers: [RolePermissionController],
    providers: [RolePermissionService],
    exports: [RolePermissionService],
})
export class RolePermissionModule {}
