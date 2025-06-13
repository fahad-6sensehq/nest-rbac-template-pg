import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'modules/auth/auth.module';
import { Permission } from 'modules/permission/entities/permission.entity';
import { PermissionModule } from 'modules/permission/permission.module';
import { Role } from 'modules/role/entities/role.entity';
import { RoleModule } from 'modules/role/role.module';
import { RolePermission } from 'modules/rolePermission/entities/rolePermission.entity';
import { RolePermissionModule } from 'modules/rolePermission/rolePermission.module';
import { Tenant } from 'modules/tenant/entities/tenant.entity';
import { TenantModule } from 'modules/tenant/tenant.module';
import { User } from 'modules/user/entities/user.entity';
import { UserModule } from 'modules/user/user.module';
import { UserRole } from 'modules/userRole/entities/userRole.entity';
import { UserRoleModule } from 'modules/userRole/userRole.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.getOrThrow('DB_HOST'),
                port: +configService.getOrThrow('DB_PORT'),
                username: configService.getOrThrow('DB_USERNAME'),
                password: configService.getOrThrow('DB_PASSWORD'),
                database: configService.getOrThrow('DB_DATABASE'),
                entities: [User, Tenant, Role, Permission, UserRole, RolePermission],
                synchronize: true,
            }),
        }),
        AuthModule,
        TenantModule,
        PermissionModule,
        RolePermissionModule,
        RoleModule,
        UserRoleModule,
        UserModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
