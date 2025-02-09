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

import { mapValues } from '../runtime';
/**
 * Last shared playback position within a folder.
 * Only available if group parameter was used and there are some audiofiles in the folder.
 * @export
 * @interface PositionShort
 */
export interface PositionShort {
    /**
     * Position timestamp - unix time in ms
     * Timestamp is generated on server, so if you post new  position 
     * it is used to check, if there is not newer position, 
     * but actual value then is assigned by server
     * @type {number}
     * @memberof PositionShort
     */
    timestamp: number;
    /**
     * Audio file (or chapter)
     * @type {string}
     * @memberof PositionShort
     */
    path: string;
    /**
     * Position in audiofile in seconds
     * @type {number}
     * @memberof PositionShort
     */
    position: number;
}

/**
 * Check if a given object implements the PositionShort interface.
 */
export function instanceOfPositionShort(value: object): value is PositionShort {
    if (!('timestamp' in value) || value['timestamp'] === undefined) return false;
    if (!('path' in value) || value['path'] === undefined) return false;
    if (!('position' in value) || value['position'] === undefined) return false;
    return true;
}

export function PositionShortFromJSON(json: any): PositionShort {
    return PositionShortFromJSONTyped(json, false);
}

export function PositionShortFromJSONTyped(json: any, ignoreDiscriminator: boolean): PositionShort {
    if (json == null) {
        return json;
    }
    return {
        
        'timestamp': json['timestamp'],
        'path': json['path'],
        'position': json['position'],
    };
}

export function PositionShortToJSON(json: any): PositionShort {
    return PositionShortToJSONTyped(json, false);
}

export function PositionShortToJSONTyped(value?: PositionShort | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'timestamp': value['timestamp'],
        'path': value['path'],
        'position': value['position'],
    };
}

