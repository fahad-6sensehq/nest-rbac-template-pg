import { DefaultStatusEnum } from 'common/enums/status.enum';

export interface IRole {
    id: string;
    name: string;
    status: DefaultStatusEnum;
    details: string;
}
