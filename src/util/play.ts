const MINUTE = 60_000;
const YEAR = 31_556_952_000;

export function calculateAutorewind(lastPlay: number) {
    const updatedBefore = Date.now() - lastPlay;
        if (updatedBefore < 10_000) return 0
        else if (updatedBefore < 5 * MINUTE) return 2
        else if (updatedBefore < 30 * MINUTE) 15
        else if (updatedBefore < YEAR) 30
        else 0
}