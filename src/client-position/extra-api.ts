import type { Position } from "../client/models";
import type { Configuration } from "../client/runtime";

export class PositionExtraApi {
    constructor(private apiConfig: Configuration, private group: string) {
        this.apiConfig = apiConfig;
        this.group = group;
    }
    /// For some reason the generated positions api (from OpenAPI specs)is missing this endpoint
    /// So it's patched here and glued to the existing api via .extra property - ugly hack
    async checkPositionForFolder(colId: number, path: string): Promise<Position | null> {
        const baseURL = this.apiConfig.basePath;
        const url = baseURL + "/positions/" + encodeURIComponent(this.group) + "/" + colId + "/" + encodeURIComponent(path);
        const response = await fetch(url, { credentials: "include" });

        if (!response.ok) {
            console.warn(`Failed to check position for folder ${path}`, response);
            return null;
        }
        return await response.json();
    }
}