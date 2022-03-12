export enum EventType{
    FileCached,
    FileDeleted
}

export interface CacheEvent {
    kind: EventType,
    item: CachedItem
}

export interface CachedItem{
    cachedUrl: string;
    originalUrl: string
    
}

export interface PrefetchDetail {
    url: string,
    folderPosition?: number,
    cancelRunning?: boolean,
    lowPriority?: boolean
}

export type PrefetchRequest = PrefetchDetail|string;

export type CacheEventHandler = (evt: CacheEvent) => void;

export interface Cache {

    getCachedUrl(url: string): Promise<CachedItem|null>;
    getCachedPaths(collection: number, folder: string): Promise<string[]>;
    cacheAhead(...urls: PrefetchRequest[]): void;
    cancelPendingLoads(pathPrefix: string, includingRunning?: boolean): void;
    addListener(l: CacheEventHandler):void;
    removeListener(l: CacheEventHandler): void;
    clearCache(): Promise<void>;
    onQueueSizeChanged(callback: (n:number)=>void);
    maxParallelLoads: number;

}