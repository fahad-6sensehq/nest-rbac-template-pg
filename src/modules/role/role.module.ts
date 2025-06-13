import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionModule } from 'modules/permission/permission.module';
import { UserModule } from 'modules/user/user.module';
import { RolePermissionModule } from '../rolePermission/rolePermission.module';
import { Role } from './entities/role.entity';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
    imports: [
        JwtModule.register({}),
        PermissionModule,
        RolePermissionModule,
        UserModule,
        TypeOrmModule.forFeature([Role]),
    ],
    controllers: [RoleController],
    providers: [RoleService],
    exports: [RoleService],
})
export class RoleModule {}
