import { User } from '../entity/user';


export interface ISessionManager {
    start_user_session: (user: User, timeout: number) => Promise<boolean>;
    end_user_session: (user: User) => Promise<boolean>;
}
