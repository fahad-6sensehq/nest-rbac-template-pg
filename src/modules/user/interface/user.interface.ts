import { RoleType } from 'common/enums/role.enum';

export enum UserStatusEnum {
    INVITED = 'invited',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export interface IUser {
    id: string;
    email: string;
    password?: string;
    name: string;
    status: UserStatusEnum;
    role: RoleType;
    resetLink?: string | null;
    lastLogin?: string | Date;
    tenantId?: string;
    createdAt?: any;
    updatedAt?: any;
    createdBy?: any;
    userId?: string;
    scopes?: string[];
    address?: any;
}

export interface IUserListQuery {
    page?: string;
    size?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}
