import session from 'express-session';
import { User } from '../models';

declare module 'express-session' {
    export interface SessionData {
        login: boolean;
        admin: boolean;
        userData: User;
        sessionString: string;
    }
}