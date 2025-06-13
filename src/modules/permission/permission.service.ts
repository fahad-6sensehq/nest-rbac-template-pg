import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConstructObjectFromDto } from 'common/instances/constructObjectFromDTO';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from './dtos/createPermission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(Permission)
        private readonly permissionRepo: Repository<Permission>,
    ) {}

    async create(createPermissionDto: CreatePermissionDto) {
        const permissionObj = ConstructObjectFromDto.constructCreatePermissionObject(createPermissionDto);

        const x = this.permissionRepo.create(permissionObj);

        return await this.permissionRepo.save(x);
    }

    async findByName(permission: string) {
        return await this.permissionRepo.findOne({ where: { name: permission } });
    }
}
