export interface CachedItem{
    isCached: boolean|null;
    cachedUrl: string;
    originalUrl: string
    
}

export interface Cache {

    getCachedUrl(url: string): Promise<CachedItem|null>;
    getCachedPaths(collection: number, folder: string): Promise<string[]>;
    cacheAhead(url:string): Promise<CachedItem>;
    cancelPendingLoad(url: string): boolean;
    maxParallelLoads: number;

}