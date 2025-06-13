import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConstructObjectFromDto } from 'common/instances/constructObjectFromDTO';
import { ExceptionHelper } from 'common/instances/ExceptionHelper';
import { PermissionService } from 'modules/permission/permission.service';
import { Repository } from 'typeorm';
import { RolePermissionService } from '../rolePermission/rolePermission.service';
import { CreateRoleDto } from './dtos/createRole.dto';
import { Role } from './entities/role.entity';
import { IRole } from './interface/role.interface';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
        private readonly permissionService: PermissionService,
        private readonly rolePermissionService: RolePermissionService,
    ) {}

    async create(createRoleDto: CreateRoleDto): Promise<IRole> {
        try {
            const obj = ConstructObjectFromDto.constructCreateRoleObject(createRoleDto.name);
            const x = this.roleRepo.create(obj);
            return await this.roleRepo.save(x);
        } catch (error) {
            if (error?.code === '23505') {
                ExceptionHelper.getInstance().defaultError(
                    'Role already exists',
                    'role_already_exists',
                    HttpStatus.CONFLICT,
                );
            }

            return error;
        }
    }

    async findByName(role: string): Promise<IRole> {
        return await this.roleRepo.findOne({ where: { name: role } });
    }

    async findAll(): Promise<IRole[]> {
        return await this.roleRepo.find();
    }

    async createRolesAndAddPermission(name: string, permissions: string[]): Promise<void> {
        const roleExists = await this.roleRepo.find({ where: { name } });
        let role: IRole;
        if (roleExists.length === 0) {
            const roleObj = ConstructObjectFromDto.constructCreateRoleObject(name);
            const x = this.roleRepo.create(roleObj);
            role = await this.roleRepo.save(x);
        } else {
            role = roleExists[0];
        }
        await this.assignPermissionToRole(role.id.toString(), permissions);
    }

    async assignPermissionToRole(roleId: string, permissions: string[]): Promise<void> {
        for (const permission of permissions) {
            let permissionObj = await this.permissionService.findByName(permission);

            if (!permissionObj) {
                permissionObj = await this.permissionService.create({ name: permission });
            }

            await this.rolePermissionService.create({
                roleId: roleId.toString(),
                permissionId: permissionObj.id.toString(),
            });
        }
        return;
    }
}
