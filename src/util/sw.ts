
function parseRange(range: string): [number, number?] {
    const r = /^bytes=(\d+)-?(\d+)?/.exec(range);
    return [Number(r[1]), r[2]?Number(r[2]):undefined]
}
export async function buildResponse(originalResponse: Response, range: string): Promise<Response>{
    if (range) {
        const body = await originalResponse.blob();
        const size = body.size;
        const [start,end] = parseRange(range);

        return new Response(body.slice(start, end?end+1:undefined),
        {   status: 206,
            headers: {
                "Content-Range": `bytes ${start}-${end?end:size-1}/${size}`,
                "Content-Type": originalResponse.headers.get("Content-Type")
            }
        })
    } else {
        return originalResponse
    }
}