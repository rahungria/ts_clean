export interface IDB_Manager {
    get_connection: () => any|Promise<any>; // TODO abstract connection object like python dbapi2 (PEP 249)
}