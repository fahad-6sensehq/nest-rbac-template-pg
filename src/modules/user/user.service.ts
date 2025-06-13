import { BadRequestException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleType } from 'common/enums/role.enum';
import { AuthHelper } from 'common/instances/auth.helper';
import { ConstructObjectFromDto } from 'common/instances/constructObjectFromDTO';
import { ExceptionHelper } from 'common/instances/ExceptionHelper';
import { PgQueryHelper } from 'common/instances/pgQuery.helper';
import { RoleService } from 'modules/role/role.service';
import { UserRoleService } from 'modules/userRole/userRole.service';
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dtos/changePassword.dto';
import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { User } from './entities/user.entity';
import { IUser, IUserListQuery, UserStatusEnum } from './interface/user.interface';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly userRoleService: UserRoleService,
        private readonly roleService: RoleService,
    ) {}

    async createUser(createUser: CreateUserDto, user?: IUser): Promise<any> {
        const userExists = await this.userRepo.findOne({ where: { email: createUser.email } });
        if (userExists) {
            return ExceptionHelper.getInstance().defaultError(
                'User already exists',
                'user_already_exists',
                HttpStatus.BAD_REQUEST,
            );
        }

        const role = await this.roleService.findByName(createUser.role);
        if (!role) {
            return ExceptionHelper.getInstance().defaultError(
                'Role does not exist',
                'role_does_not_exist',
                HttpStatus.BAD_REQUEST,
            );
        }

        let userObj;
        if (user) {
            userObj = ConstructObjectFromDto.constructCreateUserObject(createUser, user);
        } else {
            userObj = ConstructObjectFromDto.constructMainAdminObject(createUser);
        }

        const x = this.userRepo.create(userObj);
        const newUser = (await this.userRepo.save(x)) as any as IUser;

        await this.userRoleService.create({
            userId: newUser.id,
            roleId: role.id,
            tenantId: newUser.tenantId,
        });

        return newUser;
    }

    async createMainAdmin(createUser: CreateUserDto): Promise<any> {
        return this.createUser(createUser);
    }

    async create(createUser: CreateUserDto, user: IUser): Promise<any> {
        return this.createUser(createUser, user);
    }

    async findAll(user: IUser, query: IUserListQuery): Promise<{ data?: User[]; count?: number }> {
        const { page, size } = PgQueryHelper.getPageAndSize(query);

        const search = query?.search?.trim();
        const qb = this.userRepo.createQueryBuilder('user');

        qb.where('user.tenantId = :tenantId', { tenantId: user.tenantId });

        if (search) {
            PgQueryHelper.applySearchByNameOrEmail(qb, search);
        }

        qb.select([
            'user.id',
            'user.name',
            'user.email',
            'user.status',
            'user.role',
            'user.createdAt',
            'user.updatedAt',
        ]);

        PgQueryHelper.applyPaginationByCreatedAtDesc(qb, page, size);

        const [data, count] = await qb.getManyAndCount();

        return {
            data,
            count,
        };
    }

    async findOneData(userId: string): Promise<IUser> {
        const user = await this.userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user_roles', 'ur', 'ur.userId = user.id')
            .leftJoinAndSelect('role_permissions', 'rp', 'rp.roleId = ur.roleId')
            .leftJoinAndSelect('permissions', 'p', 'p.id = rp.permissionId')
            .where('user.id = :userId', { userId })
            .select(['user.id', 'user.name', 'user.email', 'user.status', 'user.role', 'user.tenantId', 'p.name'])
            .getRawMany();

        if (!user.length) return null;

        const result = user[0];

        const scopes = user.map((row) => row['p_name']);

        return {
            id: result['user_id'],
            name: result['user_name'],
            email: result['user_email'],
            status: result['user_status'],
            role: result['user_role'],
            tenantId: result['user_tenantId'],
            scopes: [...new Set(scopes)],
        };
    }

    async find(id: string): Promise<IUser> {
        return await this.findOneData(id);
    }

    async findByEmail(email: string): Promise<IUser> {
        return await this.userRepo.findOne({ where: { email } });
    }

    async findById(id: string): Promise<IUser> {
        const user = await this.userRepo.findOne({ where: { id } });

        if (!user) {
            throw ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return user;
    }

    async getUser(id: string, user: IUser): Promise<IUser> {
        const qb = this.userRepo.createQueryBuilder('user');
        PgQueryHelper.applyFilterByAndQueriesAll(qb, [{ tenantId: `${user.tenantId}` }, { id: id }]);
        PgQueryHelper.removeFields(qb, ['password', 'registrationType', 'resetLink']);

        const userResult = await qb.getOne();

        if (!userResult) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return userResult;
    }

    async isSuperAdmin(id: string): Promise<boolean> {
        const user = await this.userRepo.findOne({ where: { id, role: RoleType.SUPER_ADMIN } });

        if (!user) {
            throw ExceptionHelper.getInstance().defaultError(
                'User not super admin',
                'user_not_super_admin',
                HttpStatus.BAD_REQUEST,
            );
        }

        return true;
    }

    async updateUserLastLogin(userId: string, lastLogin: string): Promise<User> {
        await this.userRepo.update(userId, { lastLogin });
        return await this.userRepo.findOneBy({ id: userId });
    }

    async updateResetLink(userId: string, code: string | null): Promise<IUser> {
        const result = await this.userRepo
            .createQueryBuilder()
            .update()
            .set({ resetLink: code })
            .where('id = :id', { id: userId })
            .returning('*')
            .execute();

        const updatedUser = result.raw[0];

        if (!updatedUser) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return updatedUser;
    }

    async updateStatus(userId: string, status: UserStatusEnum): Promise<IUser> {
        const result = await this.userRepo
            .createQueryBuilder()
            .update()
            .set({ status })
            .where('id = :id', { id: userId })
            .returning('*')
            .execute();

        const updatedUser = result.raw[0];

        if (!updatedUser) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return updatedUser;
    }

    async getUserByResetLink(resetLink: string): Promise<IUser> {
        return await this.userRepo.findOne({ where: { resetLink } });
    }

    async updatePassword(id: string, pass: string, isSetupPassword: boolean): Promise<IUser> {
        let updatedData: { password: string; status?: UserStatusEnum } = { password: pass };

        if (isSetupPassword) {
            updatedData = { ...updatedData, status: UserStatusEnum.ACTIVE };
        }

        const res = await this.userRepo
            .createQueryBuilder()
            .update()
            .set(updatedData)
            .where('id = :id', { id: id })
            .returning('*')
            .execute();

        const updatedUser = res.raw[0];

        if (!updatedUser) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return updatedUser;
    }

    async isUniqueEmail(email: string): Promise<any> {
        const user = await this.userRepo.findOne({ where: { email } });

        if (user) {
            ExceptionHelper.getInstance().defaultError(
                `Email already exists#${email}`,
                'email_already_exists',
                HttpStatus.CONFLICT,
            );
        }

        return { success: true };
    }

    async changePassword(id: string, dto: ChangePasswordDto) {
        if (dto.newPassword !== dto.confirmNewPassword) {
            ExceptionHelper.getInstance().defaultError(
                'Password do not match',
                'password_do_not_match',
                HttpStatus.CONFLICT,
            );
        }

        const isValidPassword = await AuthHelper.validatePassword(dto.newPassword);

        if (isValidPassword.length > 0) {
            ExceptionHelper.getInstance().passwordValidation();
        }

        const user = await this.userRepo.findOne({ where: { id } });

        if (!user.password) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        const isPasswordMatched = await AuthHelper.isPasswordMatched(dto.oldPassword, user.password);

        if (!isPasswordMatched) {
            throw new BadRequestException('Invalid password');
        }

        const repeatOldPassword = await AuthHelper.isPasswordMatched(dto.newPassword, user.password);
        if (repeatOldPassword) {
            ExceptionHelper.getInstance().defaultError(
                'New password cannot be old password',
                'new_password_cannot_be_old_password',
                HttpStatus.BAD_REQUEST,
            );
        }

        const hashedPassword = await AuthHelper.hashPassword(dto.newPassword);

        const res = await this.userRepo
            .createQueryBuilder()
            .update()
            .set({ password: hashedPassword })
            .where('id = :id', { id })
            .returning(['id', 'name', 'email', 'status', 'role'])
            .execute();

        const updatedUser = res.raw[0];

        if (!updatedUser) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return updatedUser;
    }

    // async uploadAvatar(file: Express.Multer.File): Promise<{ avatar: string }> {
    //     if (NestHelper.getInstance().isEmpty(file)) {
    //         ExceptionHelper.getInstance().defaultError('File not found', 'file_not_found', HttpStatus.BAD_REQUEST);
    //     }

    //     try {
    //         // const s3Response = await S3Services.uploadFile(file);
    //         return { avatar: 'abc' };
    //     } catch (error) {
    //         this.logger.error('uploadAvatar Error uploading file: ', error);
    //         ExceptionHelper.getInstance().defaultError(
    //             'File upload failed',
    //             'file_upload_failed',
    //             HttpStatus.INTERNAL_SERVER_ERROR,
    //         );
    //     }
    // }

    // async removeAvatar(user: IUser): Promise<{ success: boolean; message: string }> {
    //     const userId = new Types.ObjectId(user.userId);

    //     const previousUser = await this.userModel.findByIdAndUpdate(
    //         userId,
    //         { $set: { avatar: null } },
    //         { new: false, projection: { avatar: 1 } },
    //     );

    //     if (!previousUser) {
    //         ExceptionHelper.getInstance().throwUserNotFoundException();
    //     }

    //     const previousAvatar = previousUser.avatar;

    //     if (!previousAvatar) {
    //         return { success: true, message: 'Avatar already removed or not set' };
    //     }

    //     const url = new URL(previousAvatar);
    //     const s3Key = url.pathname.slice(1);

    //     // const deleted = await S3Services.deleteFile(s3Key);

    //     // if (!deleted) {
    //     //     this.logger.warn(`S3 file deletion failed for key: ${s3Key}`);
    //     // }

    //     return { success: true, message: 'Avatar removed successfully' };
    // }

    async update(id: string, updateUser: UpdateUserDto, user: IUser): Promise<IUser> {
        const getUser = await this.getUser(id, user);

        if (getUser.id.toString() !== user.userId) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        // if (getUser.address.addressLine !== updateUser.addressLine || getUser.address.zip !== updateUser.zip) {
        //     const addressId = new Types.ObjectId(`${getUser.address._id}`);
        //     await this.addressService.updateOrRemove(addressId, updateUser);
        // }

        // if (!updateUser.avatar) {
        //     await this.removeAvatar(user);
        // }

        const updatedFields = {
            name: updateUser.name,
            phone: updateUser.phone,
            receiveUpdate: updateUser.receiveUpdate,
            avatar: updateUser.avatar ?? null,
        };

        const res = await this.userRepo
            .createQueryBuilder()
            .update()
            .set(updatedFields)
            .where('id = :id', { id })
            .andWhere('tenantId = :tenantId', { tenantId: user.tenantId })
            .returning(['id', 'name', 'email', 'role', 'status'])
            .execute();

        const updatedUser = res.raw[0];

        if (!updatedUser) {
            ExceptionHelper.getInstance().throwUserNotFoundException();
        }

        return updatedUser;
    }
}
