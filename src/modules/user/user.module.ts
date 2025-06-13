import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from 'modules/role/role.module';
import { UserRoleModule } from 'modules/userRole/userRole.module';
import { UserController } from 'modules/user/user.controller';
import { UserService } from 'modules/user/user.service';
import { User } from './entities/user.entity';

@Module({
    imports: [JwtModule.register({}), UserRoleModule, forwardRef(() => RoleModule), TypeOrmModule.forFeature([User])],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
