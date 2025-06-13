import { DefaultStatusEnum } from 'common/enums/status.enum';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    @Index()
    name: string;

    @Column({
        type: 'enum',
        enum: DefaultStatusEnum,
        default: DefaultStatusEnum.ACTIVE,
    })
    status: DefaultStatusEnum;

    @Column({ type: 'text', default: '' })
    details: string;

    @CreateDateColumn({ type: 'timestamp', precision: 3 })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp', precision: 3 })
    updatedAt: Date;
}
