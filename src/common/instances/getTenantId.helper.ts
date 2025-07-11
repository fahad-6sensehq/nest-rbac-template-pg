import { Injectable, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantIdGetHelper {
    static async getTenantIdFromRequest(@Req() request: Request): Promise<string> {
        const authHeader = request.headers['authorization'];

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header is missing');
        }

        const authParts = authHeader.split(' ');
        if (authParts.length !== 2 || authParts[0].toLowerCase() !== 'basic') {
            throw new UnauthorizedException('Invalid Authorization header format');
        }

        const credentialsBase64 = authParts[1];
        const credentials = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
        const [tenantId] = credentials.split(':');

        if (!tenantId) {
            throw new UnauthorizedException('Invalid client credentials');
        }

        return tenantId;
    }
}
