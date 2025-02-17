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
 * 
 * @export
 * @interface TypedFile
 */
export interface TypedFile {
    /**
     * path to the file with collection
     * @type {string}
     * @memberof TypedFile
     */
    path: string;
    /**
     * mime type of the file
     * @type {string}
     * @memberof TypedFile
     */
    mime: string;
}

/**
 * Check if a given object implements the TypedFile interface.
 */
export function instanceOfTypedFile(value: object): value is TypedFile {
    if (!('path' in value) || value['path'] === undefined) return false;
    if (!('mime' in value) || value['mime'] === undefined) return false;
    return true;
}

export function TypedFileFromJSON(json: any): TypedFile {
    return TypedFileFromJSONTyped(json, false);
}

export function TypedFileFromJSONTyped(json: any, ignoreDiscriminator: boolean): TypedFile {
    if (json == null) {
        return json;
    }
    return {
        
        'path': json['path'],
        'mime': json['mime'],
    };
}

export function TypedFileToJSON(json: any): TypedFile {
    return TypedFileToJSONTyped(json, false);
}

export function TypedFileToJSONTyped(value?: TypedFile | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'path': value['path'],
        'mime': value['mime'],
    };
}

