export interface CachedItem{
    isCached: boolean|null;
    cachedUrl: string;
    originalUrl: string
    
}

export interface Cache {

    getCachedUrl(url: string): Promise<CachedItem|null>;
    cacheAhead(url:string): Promise<CachedItem>;
    cancelPendingLoad(url: string): boolean;
    maxParallelLoads: number;

}