import { BadRequestException, HttpStatus, Injectable, Logger, NotFoundException, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Timer } from 'common/constants/timer.constants';
import { RoleType } from 'common/enums/role.enum';
import { AuthHelper } from 'common/instances/auth.helper';
import { DateHelper } from 'common/instances/date.helper';
import { ExceptionHelper } from 'common/instances/ExceptionHelper';
import { Response } from 'express';
import { CreateUserDto } from 'modules/user/dtos/createUser.dto';
import { IUser, UserStatusEnum } from 'modules/user/interface/user.interface';
import { UserService } from 'modules/user/user.service';
import { LoginDto } from './dtos/login.dto';
import { GrantType } from './enum/auth.enum';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    jwtSecret = this.configService.getOrThrow('JWT_SECRET');
    serverType = this.configService.getOrThrow('SERVER_TYPE');

    async signUpMainAdmin(createUser: CreateUserDto, tenantId: string): Promise<IUser> {
        const password = createUser.password;

        const isValidPassword = await AuthHelper.validatePassword(password);

        if (isValidPassword.length > 0) {
            ExceptionHelper.getInstance().passwordValidation();
        }

        const hashedPassword = await AuthHelper.hashPassword(createUser.password);
        createUser.password = hashedPassword;

        const userObj = {
            ...createUser,
            password: hashedPassword,
            role: RoleType.SUPER_ADMIN,
            tenantId,
            createdBy: tenantId,
        };

        const user = await this.userService.createMainAdmin(userObj);

        this.logger.log(`signUpMainAdmin: new root user created: ${user.email}`);

        return user;
    }

    async signUp(createUser: CreateUserDto, user: IUser): Promise<IUser> {
        const emailExist = await this.userService.findByEmail(createUser.email);

        let role = user?.role;

        if (emailExist) {
            await this.handleExistingEmail(createUser, user);
        }

        try {
            const userObj = {
                ...createUser,
                password: null,
                role: role,
                tenantId: user?.tenantId,
                status: UserStatusEnum.INVITED,
                createdBy: user.userId,
            };

            const newUser = await this.userService.create(userObj, user);

            if (newUser) {
                // await this.sendEmail(newUser, user);
            }

            delete newUser.password;

            this.logger.log(`signUp: user signUp: ${newUser.email}, role: ${newUser.role}`);

            return newUser;
        } catch (error) {
            this.logger.error(`signUp: signUp error: ${error}`);
            ExceptionHelper.getInstance().defaultError(error?.message, error?.code, HttpStatus.BAD_REQUEST);
        }
    }

    async handleExistingEmail(createUser: CreateUserDto, user: IUser) {
        // Check if the user is already invited but not assigned to a project yet
        ExceptionHelper.getInstance().defaultError(
            `Email address already exists#${createUser?.email}`,
            'email_address_already_exists',
            HttpStatus.CONFLICT,
        );
    }

    // async sendEmail(newUser: IUser, user: IUser): Promise<any> {
    //     const token = await this.generateResetLink(newUser);
    //     await this.userService.updateResetLink(newUser._id.toString(), token);
    //     // const link = `${appConfig.appUrl}forgot-password/verify/reset-password?token=${token}&email=${newUser?.email}&setupPassword=true`;
    //     const link = 'abc';

    //     const text = EmailTemplate.sendClientInviteEmailHtml(newUser.email, link);

    //     // const iAwsSesSendEmail: IAwsSesSendEmail = {
    //     //     to: newUser?.email,
    //     //     from: 'hello@reelsync.io',
    //     //     subject: 'User Invitation',
    //     //     text: text,
    //     //     sendersName: user.name,
    //     // };

    //     // return await this.emailService.sendEmailWithZeptomail(iAwsSesSendEmail);
    // }

    async signIn(loginDto: LoginDto, @Res() res: Response): Promise<Response> {
        let user: IUser;

        if (loginDto?.type === GrantType.PASSWORD) {
            user = await this.userService.findByEmail(loginDto.email);

            if (!user?.password) {
                throw new NotFoundException('Invalid email or password.');
            }

            const isPasswordMatched = await AuthHelper.isPasswordMatched(loginDto.password, user.password);

            if (!isPasswordMatched) {
                throw new BadRequestException('Invalid email or password.');
            }
        } else if (loginDto.type === GrantType.TOKEN) {
            try {
                const decoded = this.jwtService.verify(loginDto.token, { secret: this.jwtSecret });
                user = await this.userService.findByEmail(decoded.email);

                if (!user) {
                    throw ExceptionHelper.getInstance().throwUserNotFoundException();
                }
            } catch (e) {
                throw new BadRequestException('Invalid refresh token.');
            }
        } else {
            throw new BadRequestException('Invalid grant type.');
        }

        // update last login time
        const lastLogin = new DateHelper().getNowInISOString();
        user.lastLogin = new Date(lastLogin);
        await this.userService.updateUserLastLogin(user.id.toString(), lastLogin);

        // fetch all the permissions
        user = await this.userService.find(user.id.toString());

        // set token expiration based on users selection
        let accessToken: string, refreshToken: string;
        const expiresIn = loginDto.remember ? Timer.MONTH : Timer.DAY;

        ({ accessToken, refreshToken } = await this.generateToken(user, expiresIn));

        // const accessTokenMaxAge = 1000 * expiresIn;
        // const refreshTokenMaxAge = 1000 * (loginDto.remember ? Timer.MONTH : Timer.DAY);

        // res.cookie('accessToken', accessToken, {
        //     httpOnly: true,
        //     secure: this.serverType === 'prod',
        //     sameSite: this.serverType === 'prod' ? 'strict' : 'lax',
        //     maxAge: accessTokenMaxAge,
        // });

        // res.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     secure: this.serverType === 'prod',
        //     sameSite: this.serverType === 'prod' ? 'strict' : 'lax',
        //     maxAge: refreshTokenMaxAge,
        // });

        this.logger.log(`signIn: user signIn: ${user.email}, role: ${user.role}`);

        return res.json({
            token: {
                accessToken,
                refreshToken,
            },
            user,
        });
    }

    async generateToken(user: IUser, expiresIn: number): Promise<{ accessToken: string; refreshToken: string }> {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.sign(
                { userId: user.id, email: user.email, role: user.role },
                { secret: this.jwtSecret, expiresIn: expiresIn },
            ),
            this.jwtService.sign(
                { userId: user.id, email: user.email, role: user.role },
                { secret: this.jwtSecret, expiresIn: Timer.MONTH },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    // async sendForgetPasswordLink(forgetDto: ForgetPassDto, tenantId: string): Promise<any> {
    //     const user = await this.userService.findByEmail(forgetDto.email);

    //     if (!user || user.status === UserStatusEnum.INVITED || user.tenantId.toString() !== tenantId) {
    //         throw ExceptionHelper.getInstance().throwUserNotFoundException();
    //     }

    //     delete user.password;
    //     delete user.resetLink;

    //     const token = await this.generateResetLink(user);
    //     await this.userService.updateResetLink(user._id.toString(), token);
    //     // const link = `${appConfig.appUrl}forgot-password/verify/reset-password?token=${token}&email=${user?.email}`;
    //     const link = 'abc';

    //     const text = EmailTemplate.forgetPasswordEmailHtml(link);

    //     // const iAwsSesSendEmail: IAwsSesSendEmail = {
    //     //     to: user?.email,
    //     //     from: 'hello@reelsync.io',
    //     //     subject: 'Forgot Password',
    //     //     text: text,
    //     //     sendersName: 'ReelSync.io',
    //     // };

    //     // await this.emailService.sendEmailWithZeptomail(iAwsSesSendEmail);

    //     return { success: true };
    // }

    // async setPassword(resetDto: SetPasswordDto): Promise<IUser> {
    //     return await this.handlePasswordSetup(resetDto, true);
    // }

    // async resetPassword(resetDto: SetPasswordDto): Promise<IUser> {
    //     return await this.handlePasswordSetup(resetDto, false);
    // }

    // async handlePasswordSetup(resetDto: SetPasswordDto, isSetPassword: boolean): Promise<IUser> {
    //     const user = await this.userService.getUserByResetLink(resetDto.token);

    //     if (!user) {
    //         ExceptionHelper.getInstance().throwUserNotFoundException();
    //     } else {
    //         try {
    //             this.jwtService.verify(resetDto.token, { secret: this.jwtSecret }) as object;
    //             const jwtObject = this.jwtService.decode(resetDto.token);

    //             if (jwtObject.email !== user.email) {
    //                 ExceptionHelper.getInstance().tokenExpired();
    //             }
    //         } catch (error) {
    //             ExceptionHelper.getInstance().tokenExpired();
    //         }

    //         const res = await this.updatePassword(user, resetDto.password, resetDto.confirmPassword, isSetPassword);

    //         if (!NestHelper.getInstance().isEmpty(res)) {
    //             await this.userService.updateResetLink(user._id.toString(), null);
    //         }

    //         return res;
    //     }
    // }

    // async updatePassword(
    //     user: IUser,
    //     password: string,
    //     confirmPassword: string,
    //     isSetupPassword: boolean,
    // ): Promise<IUser | null> {
    //     const passwordBuffer = Buffer.from(password, 'utf-8');
    //     const confirmPasswordBuffer = Buffer.from(confirmPassword, 'utf-8');

    //     if (
    //         passwordBuffer.length === confirmPasswordBuffer.length &&
    //         crypto.timingSafeEqual(passwordBuffer, confirmPasswordBuffer)
    //     ) {
    //         const vp = await AuthHelper.validatePassword(password);
    //         if (!NestHelper.getInstance().isEmpty(vp)) {
    //             ExceptionHelper.getInstance().passwordValidation();
    //         } else {
    //             const pass = await AuthHelper.hashPassword(password);
    //             const userData = await this.userService.updatePassword(user._id.toString(), pass, isSetupPassword);
    //             return userData;
    //         }
    //     }

    //     throw new BadRequestException({
    //         statusCode: HttpStatus.BAD_REQUEST,
    //         message: "Password doesn't match",
    //     });
    // }

    // async tokenVerify(verifyTokenDto: VerifyTokenDto): Promise<any> {
    //     const user = await this.userService.getUserByResetLink(verifyTokenDto.token);

    //     if (!user) {
    //         ExceptionHelper.getInstance().throwUserNotFoundException();
    //     } else {
    //         try {
    //             this.jwtService.verify(verifyTokenDto.token, { secret: this.jwtSecret }) as object;
    //             return { success: true };
    //         } catch (error) {
    //             ExceptionHelper.getInstance().tokenExpired();
    //         }
    //     }
    // }

    // async generateResetLink(user: IUser): Promise<string> {
    //     const token = this.jwtService.sign(
    //         {
    //             userId: user?._id,
    //             userType: user?.role,
    //             tenantId: user?.tenantId,
    //             email: user?.email,
    //         },
    //         {
    //             secret: this.jwtSecret,
    //             expiresIn: Timer.MINUTES_30,
    //         },
    //     );

    //     await this.userService.updateResetLink(user?._id.toString(), token);
    //     return token;
    // }
}
