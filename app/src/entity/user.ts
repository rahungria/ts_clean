export type UserType = {
    id?: number
    username: string
    password: string,
    role?: string
}


export class User {
    public id?: number;
    public username: string;
    public password: string;
    public role?: string

    public constructor(data: UserType) {
        this.id = data.id
        this.username = data.username;
        this.password = data.password;
        this.role = data.role
    }

    public to_json() {
        return {
            id: this.id,
            username: this.username,
            role: this.role
        }
    }
}