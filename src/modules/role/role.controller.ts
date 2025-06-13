import { Body, Controller, Post } from '@nestjs/common';
import { CreateRoleDto } from './dtos/createRole.dto';
import { RoleService } from './role.service';

@Controller('role')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Post()
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.roleService.create(createRoleDto);
    }

    // @Get()
    // @RequirePermissions('role.view')
    // findAll() {
    //     return this.roleService.findAll();
    // }
}
