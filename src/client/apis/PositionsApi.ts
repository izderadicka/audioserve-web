/* tslint:disable */
/* eslint-disable */
/**
 * audioserve API
 * REST API for audioserve
 *
 * The version of the OpenAPI document: 1.3.2
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  Position,
} from '../models/index';
import {
    PositionFromJSON,
    PositionToJSON,
} from '../models/index';

export interface PositionsGroupGetRequest {
    group: string;
    finished?: boolean;
    unfinished?: boolean;
    from?: number;
    to?: number;
}

export interface PositionsGroupLastGetRequest {
    group: string;
}

export interface PositionsGroupPostRequest {
    group: string;
    position: Position | null;
}

/**
 * 
 */
export class PositionsApi extends runtime.BaseAPI {

    /**
     * Get recent positions for the group
     */
    async positionsGroupGetRaw(requestParameters: PositionsGroupGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<Position>>> {
        if (requestParameters['group'] == null) {
            throw new runtime.RequiredError(
                'group',
                'Required parameter "group" was null or undefined when calling positionsGroupGet().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['finished'] != null) {
            queryParameters['finished'] = requestParameters['finished'];
        }

        if (requestParameters['unfinished'] != null) {
            queryParameters['unfinished'] = requestParameters['unfinished'];
        }

        if (requestParameters['from'] != null) {
            queryParameters['from'] = requestParameters['from'];
        }

        if (requestParameters['to'] != null) {
            queryParameters['to'] = requestParameters['to'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("bearerAuth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/positions/{group}`.replace(`{${"group"}}`, encodeURIComponent(String(requestParameters['group']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(PositionFromJSON));
    }

    /**
     * Get recent positions for the group
     */
    async positionsGroupGet(requestParameters: PositionsGroupGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<Position>> {
        const response = await this.positionsGroupGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Last recent position for this group
     */
    async positionsGroupLastGetRaw(requestParameters: PositionsGroupLastGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Position>> {
        if (requestParameters['group'] == null) {
            throw new runtime.RequiredError(
                'group',
                'Required parameter "group" was null or undefined when calling positionsGroupLastGet().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("bearerAuth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/positions/{group}/last`.replace(`{${"group"}}`, encodeURIComponent(String(requestParameters['group']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => PositionFromJSON(jsonValue));
    }

    /**
     * Last recent position for this group
     */
    async positionsGroupLastGet(requestParameters: PositionsGroupLastGetRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Position> {
        const response = await this.positionsGroupLastGetRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Updates recent position for given group
     */
    async positionsGroupPostRaw(requestParameters: PositionsGroupPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<void>> {
        if (requestParameters['group'] == null) {
            throw new runtime.RequiredError(
                'group',
                'Required parameter "group" was null or undefined when calling positionsGroupPost().'
            );
        }

        if (requestParameters['position'] == null) {
            throw new runtime.RequiredError(
                'position',
                'Required parameter "position" was null or undefined when calling positionsGroupPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("bearerAuth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/positions/{group}`.replace(`{${"group"}}`, encodeURIComponent(String(requestParameters['group']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: PositionToJSON(requestParameters['position']),
        }, initOverrides);

        return new runtime.VoidApiResponse(response);
    }

    /**
     * Updates recent position for given group
     */
    async positionsGroupPost(requestParameters: PositionsGroupPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<void> {
        await this.positionsGroupPostRaw(requestParameters, initOverrides);
    }

}
