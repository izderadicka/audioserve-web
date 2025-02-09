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
import type { AudioFile } from './AudioFile';
import {
    AudioFileFromJSON,
    AudioFileFromJSONTyped,
    AudioFileToJSON,
    AudioFileToJSONTyped,
} from './AudioFile';
import type { Subfolder } from './Subfolder';
import {
    SubfolderFromJSON,
    SubfolderFromJSONTyped,
    SubfolderToJSON,
    SubfolderToJSONTyped,
} from './Subfolder';
import type { PositionShort } from './PositionShort';
import {
    PositionShortFromJSON,
    PositionShortFromJSONTyped,
    PositionShortToJSON,
    PositionShortToJSONTyped,
} from './PositionShort';
import type { TypedFile } from './TypedFile';
import {
    TypedFileFromJSON,
    TypedFileFromJSONTyped,
    TypedFileToJSON,
    TypedFileToJSONTyped,
} from './TypedFile';

/**
 * 
 * @export
 * @interface AudioFolder
 */
export interface AudioFolder {
    /**
     * Is virtual folder - e.g. representing big chapterized file (.m4b etc.)
     * @type {boolean}
     * @memberof AudioFolder
     */
    isFile?: boolean;
    /**
     * Folder contains files from CD subfolders, structure is collapsed
     * @type {boolean}
     * @memberof AudioFolder
     */
    isCollapsed?: boolean;
    /**
     * last modification timestamp (unix time in miliseconds)
     * @type {number}
     * @memberof AudioFolder
     */
    modified?: number;
    /**
     * Total playback time of the audiofolder in seconds
     * @type {number}
     * @memberof AudioFolder
     */
    totalTime?: number;
    /**
     * 
     * @type {Array<Subfolder>}
     * @memberof AudioFolder
     */
    subfolders?: Array<Subfolder>;
    /**
     * 
     * @type {Array<AudioFile>}
     * @memberof AudioFolder
     */
    files?: Array<AudioFile>;
    /**
     * 
     * @type {TypedFile}
     * @memberof AudioFolder
     */
    cover?: TypedFile | null;
    /**
     * 
     * @type {TypedFile}
     * @memberof AudioFolder
     */
    description?: TypedFile | null;
    /**
     * Metadata tags for this folders - map of name to value
     * @type {object}
     * @memberof AudioFolder
     */
    tags?: object | null;
    /**
     * 
     * @type {PositionShort}
     * @memberof AudioFolder
     */
    position?: PositionShort | null;
}

/**
 * Check if a given object implements the AudioFolder interface.
 */
export function instanceOfAudioFolder(value: object): value is AudioFolder {
    return true;
}

export function AudioFolderFromJSON(json: any): AudioFolder {
    return AudioFolderFromJSONTyped(json, false);
}

export function AudioFolderFromJSONTyped(json: any, ignoreDiscriminator: boolean): AudioFolder {
    if (json == null) {
        return json;
    }
    return {
        
        'isFile': json['is_file'] == null ? undefined : json['is_file'],
        'isCollapsed': json['is_collapsed'] == null ? undefined : json['is_collapsed'],
        'modified': json['modified'] == null ? undefined : json['modified'],
        'totalTime': json['total_time'] == null ? undefined : json['total_time'],
        'subfolders': json['subfolders'] == null ? undefined : ((json['subfolders'] as Array<any>).map(SubfolderFromJSON)),
        'files': json['files'] == null ? undefined : ((json['files'] as Array<any>).map(AudioFileFromJSON)),
        'cover': json['cover'] == null ? undefined : TypedFileFromJSON(json['cover']),
        'description': json['description'] == null ? undefined : TypedFileFromJSON(json['description']),
        'tags': json['tags'] == null ? undefined : json['tags'],
        'position': json['position'] == null ? undefined : PositionShortFromJSON(json['position']),
    };
}

export function AudioFolderToJSON(json: any): AudioFolder {
    return AudioFolderToJSONTyped(json, false);
}

export function AudioFolderToJSONTyped(value?: AudioFolder | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'is_file': value['isFile'],
        'is_collapsed': value['isCollapsed'],
        'modified': value['modified'],
        'total_time': value['totalTime'],
        'subfolders': value['subfolders'] == null ? undefined : ((value['subfolders'] as Array<any>).map(SubfolderToJSON)),
        'files': value['files'] == null ? undefined : ((value['files'] as Array<any>).map(AudioFileToJSON)),
        'cover': TypedFileToJSON(value['cover']),
        'description': TypedFileToJSON(value['description']),
        'tags': value['tags'],
        'position': PositionShortToJSON(value['position']),
    };
}

