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
 * @interface CollectionsInfo
 */
export interface CollectionsInfo {
    /**
     * Names of available collections
     * @type {Array<string>}
     * @memberof CollectionsInfo
     */
    names?: Array<string>;
    /**
     * Size of names array
     * @type {number}
     * @memberof CollectionsInfo
     */
    count?: number;
    /**
     * Is folder download endpoint enabled on server?
     * @type {boolean}
     * @memberof CollectionsInfo
     */
    folderDownload?: boolean;
    /**
     * Is playback position API enabled on server?
     * @type {boolean}
     * @memberof CollectionsInfo
     */
    sharedPositions?: boolean;
    /**
     * Is RSS feed endpoint enabled on server?
     * @type {boolean}
     * @memberof CollectionsInfo
     */
    rssFeed?: boolean;
    /**
     * Version of audioserve (and thus also version of API)
     * @type {string}
     * @memberof CollectionsInfo
     */
    version?: string;
    /**
     * Commit hash of audioserve (short 7 characters)
     * @type {string}
     * @memberof CollectionsInfo
     */
    commit?: string;
}

/**
 * Check if a given object implements the CollectionsInfo interface.
 */
export function instanceOfCollectionsInfo(value: object): value is CollectionsInfo {
    return true;
}

export function CollectionsInfoFromJSON(json: any): CollectionsInfo {
    return CollectionsInfoFromJSONTyped(json, false);
}

export function CollectionsInfoFromJSONTyped(json: any, ignoreDiscriminator: boolean): CollectionsInfo {
    if (json == null) {
        return json;
    }
    return {
        
        'names': json['names'] == null ? undefined : json['names'],
        'count': json['count'] == null ? undefined : json['count'],
        'folderDownload': json['folder_download'] == null ? undefined : json['folder_download'],
        'sharedPositions': json['shared_positions'] == null ? undefined : json['shared_positions'],
        'rssFeed': json['rss_feed'] == null ? undefined : json['rss_feed'],
        'version': json['version'] == null ? undefined : json['version'],
        'commit': json['commit'] == null ? undefined : json['commit'],
    };
}

export function CollectionsInfoToJSON(json: any): CollectionsInfo {
    return CollectionsInfoToJSONTyped(json, false);
}

export function CollectionsInfoToJSONTyped(value?: CollectionsInfo | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'names': value['names'],
        'count': value['count'],
        'folder_download': value['folderDownload'],
        'shared_positions': value['sharedPositions'],
        'rss_feed': value['rssFeed'],
        'version': value['version'],
        'commit': value['commit'],
    };
}

