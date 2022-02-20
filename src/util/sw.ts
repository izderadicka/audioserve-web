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

export async function envictCache(
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
