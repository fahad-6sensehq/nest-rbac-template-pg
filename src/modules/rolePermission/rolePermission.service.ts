import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRolePermissionDto } from 'modules/tenant/dtos/createRolePermission.dto';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/rolePermission.entity';

@Injectable()
export class RolePermissionService {
    constructor(
        @InjectRepository(RolePermission)
        private readonly rolePermissionRepo: Repository<RolePermission>,
    ) {}

    async create(createRolePermissionDto: CreateRolePermissionDto) {
        const rolePermissionObj = {
            roleId: createRolePermissionDto.roleId,
            permissionId: createRolePermissionDto.permissionId,
        };

        const rolePermissionExists = await this.rolePermissionRepo.find({
            where: { roleId: rolePermissionObj.roleId, permissionId: rolePermissionObj.permissionId },
        });

        if (rolePermissionExists.length > 0) {
            return rolePermissionExists[0];
        }

        const x = this.rolePermissionRepo.create(rolePermissionObj);
        const rolePermission = await this.rolePermissionRepo.save(x);

        return rolePermission;
    }
}
