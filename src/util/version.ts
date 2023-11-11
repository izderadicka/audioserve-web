export const ENVIRONMENT = import.meta.env.MODE;
export const APP_VERSION = import.meta.env.VITE_VERSION;
export const APP_COMMIT =  import.meta.env.VITE_COMMIT_HASH_SHORT;

export const isDevelopment = ENVIRONMENT === "development"; 