import * as bcrypt from 'bcryptjs';

export class AuthHelper {
    static isPasswordMatched = async (password: string, userPass: string): Promise<boolean> => {
        return await bcrypt.compare(password, userPass);
    };

    static hashPassword = async (password: string): Promise<string> => {
        return await bcrypt.hash(password, 12);
    };

    static validatePassword = async (password: string): Promise<string[]> => {
        const errors: string[] = [];

        if (password.length < 8) errors.push('Password must be at least 8 characters long.');
        if (!/[A-Z]/.test(password)) errors.push('Password must have at least one uppercase letter.');
        if (!/[a-z]/.test(password)) errors.push('Password must have at least one lowercase letter.');
        if (!/\d/.test(password)) errors.push('Password must have at least one number.');
        // if (!/[#?!@$%^&*-]/.test(password)) errors.push('Password must have at least one special character.');

        return errors.length > 0 ? errors : [];
    };
}
