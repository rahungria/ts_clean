export class UserRole {

    public id: number
    public name: string

    constructor(
        {
            id, 
            name
        }:
        {
            id: number,
            name:string
        }
    ) {
        this.id = id
        this.name = name
    }

    public to_json() {
        return {
            id: this.id,
            name: this.name
        }
    }
}