export declare function setAuthToken(token: string): void;

export declare type Stack = 'backend' | 'frontend';
export declare type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export declare type BackendPackage = 'cache' | 'controller' | 'cronjob' | 'db' | 'domain' | 'handler' | 'repository' | 'route' | 'service';
export declare type FrontendPackage = 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';
export declare type SharedPackage = 'auth' | 'config' | 'middleware' | 'utils';
export declare type Package = BackendPackage | FrontendPackage | SharedPackage;

export declare function Log(stack: Stack, level: Level, pkg: Package, message: string): Promise<any>;
