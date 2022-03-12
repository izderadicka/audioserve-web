function parseRange(range: string): [number, number?] {
  const r = /^bytes=(\d+)-?(\d+)?/.exec(range);
  return [Number(r[1]), r[2] ? Number(r[2]) : undefined];
}
export async function buildResponse(
  originalResponse: Response,
  range: string
): Promise<Response> {
  if (range) {
    const body = await originalResponse.blob();
    const size = body.size;
    const [start, end] = parseRange(range);

    return new Response(body.slice(start, end ? end + 1 : undefined), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end ? end : size - 1}/${size}`,
        "Content-Type": originalResponse.headers.get("Content-Type"),
      },
    });
  } else {
    return originalResponse;
  }
}

export async function evictCache(
  cache: Cache,
  sizeLimit: number,
  onDelete: (req: Request) => void
): Promise<void> {
  const keys = await cache.keys();
  const toDelete = keys.length - sizeLimit;
  if (toDelete > 0) {
    const deleteList = keys.slice(0, toDelete);
    for (const key of deleteList.reverse()) {
      if (await cache.delete(key)) {
        onDelete(key);
      }
    }
  }
}

export function cloneRequest(req:Request): Request {
    return new Request(req.url, {
        credentials: 'include'
    });

}

export function logFetchError(e: any, url: string) {
  if (e instanceof DOMException && e.name == "AbortError") {
    console.debug(`Caching of ${url} was aborted`);
  } else {
    console.error(`Error caching of ${url}: ${e}`, e);
  }
}

class FetchQueueItem {
  constructor(public url: string, public abort: AbortController, 
    public isDirect: boolean, public folderPosition?: number) {}
}

export class FetchQueue {

  private queue: FetchQueueItem[] = [];

  constructor() {}

  has(url: string) {
    return this.queue.findIndex((i) => i.url === url)>=0
  }

  add(url: string, abort: AbortController, isDirect?: boolean, folderPosition?: number) {
    // abort all previous direct request 
    if (isDirect) this.queue.forEach((i) => {if (i.isDirect) i.abort.abort()});
    this.queue.push(new FetchQueueItem(url,abort,isDirect,folderPosition))
  }

  delete(url: string) {
    const idx = this.queue.findIndex((i) => i.url === url);
    if (idx>=0) {
      this.queue.splice(idx,1)
    }
  }

  abort(pathPrefix: string, keepDirect?: boolean) {
    for (const i of this.queue) {
      if (!(keepDirect && i.isDirect) && (!pathPrefix || new URL(i.url).pathname.startsWith(pathPrefix))) {
        i.abort.abort()
      }
    }
  }
}
