import { UserRole } from "./user_role";

export type UserType = {
    id?: number
    username: string
    password: string,
    role?: UserRole
}


export class User {
    public id?: number
    public username: string
    public password: string
    public role: UserRole

    public constructor(
        {id, username, password, role}:
        {
            id: number,
            username: string,
            password: string,
            role: UserRole
        }
    ) {
        this.id = id
        this.username = username
        this.password = password
        this.role = role
    }

    public to_json() {
        return {
            id: this.id,
            username: this.username,
            role: this.role.to_json()
        }
    }
}