import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConstructObjectFromDto } from 'common/instances/constructObjectFromDTO';
import { ExceptionHelper } from 'common/instances/ExceptionHelper';
import { RolePermissions } from 'common/rolePermissions';
import { RoleService } from 'modules/role/role.service';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dtos/createTenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
    private readonly logger = new Logger(TenantService.name);
    constructor(
        @InjectRepository(Tenant)
        private readonly tenantRepo: Repository<Tenant>,
        private readonly roleService: RoleService,
    ) {}

    async create(tenantDto: CreateTenantDto) {
        const tenantObj = ConstructObjectFromDto.constructCreateTenantObject(tenantDto);

        try {
            const rolePermissions = RolePermissions();

            if (rolePermissions.length === 0) {
                this.logger.error('role permissions not found');
                ExceptionHelper.getInstance().defaultError(
                    'role permissions not found',
                    'something went wrong',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const x = this.tenantRepo.create(tenantObj);
            const tenant = await this.tenantRepo.save(x);
            for (const role of rolePermissions) {
                await this.roleService.createRolesAndAddPermission(role.name, role.permissions);
            }

            this.logger.log('tenant created, default role and permission created');

            return tenant;
        } catch (err) {
            this.logger.error('failed to create tenant');
            ExceptionHelper.getInstance().defaultError(err?.message, 'something went wrong', HttpStatus.BAD_REQUEST);
        }
    }

    async validateTenantCredentials(tenantId: string, tenantSecret: string) {
        try {
            const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
            if (tenant && tenant?.secret === tenantSecret) {
                return tenant;
            }
        } catch {
            return null;
        }
    }

    async findAll() {
        return await this.tenantRepo.find();
    }

    async findOneById(id: string) {
        return await this.tenantRepo.findOne({ where: { id } });
    }

    async rolePermissions() {
        const rolePermissions = RolePermissions();

        if (rolePermissions.length === 0) {
            this.logger.error('role permissions not found');
            ExceptionHelper.getInstance().defaultError(
                'role permissions not found',
                'something went wrong',
                HttpStatus.BAD_REQUEST,
            );
        }

        for (const role of rolePermissions) {
            await this.roleService.createRolesAndAddPermission(role.name, role.permissions);
        }

        return { message: 'Role and permissions created' };
    }

    async warmup() {
        return { success: true };
    }
}
