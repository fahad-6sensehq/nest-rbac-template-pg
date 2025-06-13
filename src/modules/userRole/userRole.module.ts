import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleController } from 'modules/userRole/userRole.controller';
import { UserRole } from './entities/userRole.entity';
import { UserRoleService } from './userRole.service';

@Module({
    imports: [TypeOrmModule.forFeature([UserRole])],
    controllers: [UserRoleController],
    providers: [UserRoleService],
    exports: [UserRoleService],
})
export class UserRoleModule {}
