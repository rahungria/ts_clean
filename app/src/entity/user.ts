export type UserType = {
    id?: number
    username: string
    password: string
}


export class User {
    public id?: number;
    public username?: string;
    private password?: string;

    public constructor(data: UserType) {
        this.id = data.id
        this.username = data.username;
        this.password = data.password;
    }

    public to_json() {
        return {
            id: this.id,
            username: this.username,
        }
    }
}