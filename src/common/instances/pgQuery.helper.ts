import { SelectQueryBuilder } from 'typeorm';

type SimpleCondition = { [key: string]: any };

type OperatorCondition = {
    key: string;
    operator: '=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE' | 'ILIKE' | '!=';
    value: any;
};

type RawCondition = {
    raw: string;
    params?: Record<string, any>;
};

type Condition = SimpleCondition | OperatorCondition | RawCondition;

export class PgQueryHelper {
    static applyFilterByAndQueriesAll(qb: SelectQueryBuilder<any>, conditions: Condition[]) {
        conditions.forEach((cond, index) => {
            if ('raw' in cond) {
                if (index === 0) {
                    qb.where(cond.raw, cond.params);
                } else {
                    qb.andWhere(cond.raw, cond.params);
                }
            } else if ('key' in cond && 'operator' in cond && 'value' in cond) {
                const paramKey = `param_${index}`;
                let clause: string;

                if (cond.operator.toUpperCase() === 'IN' && Array.isArray(cond.value)) {
                    clause = `user.${cond.key} IN (:...${paramKey})`;
                } else {
                    clause = `user.${cond.key} ${cond.operator} :${paramKey}`;
                }

                const params = { [paramKey]: cond.value };

                if (index === 0) {
                    qb.where(clause, params);
                } else {
                    qb.andWhere(clause, params);
                }
            } else {
                const keys = Object.keys(cond);
                keys.forEach((key, keyIndex) => {
                    const paramKey = `param_${index}_${keyIndex}`;
                    const clause = `user.${key} = :${paramKey}`;
                    const params = { [paramKey]: cond[key] };

                    if (index === 0 && keyIndex === 0) {
                        qb.where(clause, params);
                    } else {
                        qb.andWhere(clause, params);
                    }
                });
            }
        });
    }

    static getPageAndSize(query: any) {
        const page = query?.page && !isNaN(+query.page) ? +query.page : 1;
        const size = query?.size && !isNaN(+query.size) ? +query.size : 10;

        return { page, size };
    }

    static applySearchByNameOrEmail(qb: SelectQueryBuilder<any>, search?: string) {
        if (search?.trim()) {
            const escaped = `%${search.trim()}%`;
            qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', { search: escaped });
        }
    }

    static applySearchByName(qb: SelectQueryBuilder<any>, name?: string) {
        if (name?.trim()) {
            const escaped = `%${name.trim()}%`;
            qb.andWhere('user.name ILIKE :name', { name: escaped });
        }
    }

    static applySearchByEmail(qb: SelectQueryBuilder<any>, email?: string) {
        if (email?.trim()) {
            const escaped = `%${email.trim()}%`;
            qb.andWhere('user.email ILIKE :email', { email: escaped });
        }
    }

    static applyPaginationByCreatedAtDesc(qb: SelectQueryBuilder<any>, page: number, size: number) {
        qb.orderBy('user.createdAt', 'DESC')
            .skip((page - 1) * size)
            .take(size);
    }

    static applyPaginationByCreatedAtAsc(qb: SelectQueryBuilder<any>, page: number, size: number) {
        qb.orderBy('user.createdAt', 'ASC')
            .skip((page - 1) * size)
            .take(size);
    }

    static removeFields(qb: SelectQueryBuilder<any>, fieldsToRemove: string[]) {
        const alias = qb.alias;
        const metadata = qb.connection.getMetadata(qb.expressionMap.mainAlias!.target);

        const allColumns = metadata.columns.map((col) => col.propertyName);
        const columnsToSelect = allColumns.filter((col) => !fieldsToRemove.includes(col));
        const selectFields = columnsToSelect.map((col) => `${alias}.${col}`);

        qb.select(selectFields);
    }
}
