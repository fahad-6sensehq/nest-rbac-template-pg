import { DefaultStatusEnum } from 'common/enums/status.enum';
import { Role } from 'modules/role/entities/role.entity';
import { Tenant } from 'modules/tenant/entities/tenant.entity';
import { User } from 'modules/user/entities/user.entity';
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

@Entity('user_roles')
export class UserRole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    userId: string;

    @Column({ type: 'uuid' })
    @Index()
    roleId: string;

    @Column({ type: 'uuid' })
    @Index()
    tenantId: string;

    @Column({
        type: 'enum',
        enum: DefaultStatusEnum,
        default: DefaultStatusEnum.ACTIVE,
    })
    status: DefaultStatusEnum;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Role, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roleId' })
    role: Role;

    @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenantId' })
    tenant: Tenant;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
