export interface IDB_Manager {
    get_connection: () => any|Promise<any>; // TODO abstract connection object like python dbapi2 (PEP 249)
    close_connection: (connection: any) => Promise<void>;  // closes a single given connection
    end: () => Promise<void>;  // closes Pool or ends connection completely
}
