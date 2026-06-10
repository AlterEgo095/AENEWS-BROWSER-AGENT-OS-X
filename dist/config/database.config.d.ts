export declare const databaseConfig: (() => {
    type: "postgres";
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    synchronize: boolean;
    logging: boolean;
    poolSize: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    type: "postgres";
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    synchronize: boolean;
    logging: boolean;
    poolSize: number;
}>;
