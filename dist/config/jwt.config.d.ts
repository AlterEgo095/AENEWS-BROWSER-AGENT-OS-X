export declare const jwtConfig: (() => {
    secret: string;
    expiration: string;
    refreshExpiration: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: string;
    expiration: string;
    refreshExpiration: string;
}>;
