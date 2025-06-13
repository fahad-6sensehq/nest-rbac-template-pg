import { RegistrationTypeEnum } from 'common/enums/globalStatus.enum';
import { RoleType } from 'common/enums/role.enum';
import { Tenant } from 'modules/tenant/entities/tenant.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserStatusEnum } from '../interface/user.interface';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    @Index()
    email: string;

    @Column({ type: 'varchar', nullable: true })
    password: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({
        type: 'enum',
        enum: UserStatusEnum,
        default: UserStatusEnum.INVITED,
    })
    status: UserStatusEnum;

    @Column({
        type: 'enum',
        enum: RoleType,
    })
    role: RoleType;

    @Column({
        type: 'enum',
        enum: RegistrationTypeEnum,
        default: RegistrationTypeEnum.PASSWORD,
    })
    registrationType: RegistrationTypeEnum;

    @Column({ type: 'varchar', nullable: true })
    resetLink: string;

    @Column({ type: 'timestamp', nullable: true })
    lastLogin: Date;

    @Column({ type: 'uuid' })
    @Index()
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
