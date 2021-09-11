export interface IHashable {
    hash: (data: string) => string|Promise<string>;
    compare: (data: string, hashed: string) => boolean|Promise<boolean>;
}
