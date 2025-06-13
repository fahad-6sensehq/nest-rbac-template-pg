import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserRoleDto } from './dtos/createUserRole.dto';
import { UserRole } from './entities/userRole.entity';

@Injectable()
export class UserRoleService {
    constructor(
        @InjectRepository(UserRole)
        private readonly userRoleRepo: Repository<UserRole>,
    ) {}

    async create(createUserRoleDto: CreateUserRoleDto) {
        const dto = this.userRoleRepo.create(createUserRoleDto);

        return await this.userRoleRepo.save(dto);
    }
}
