import { currentFolder, selectedCollection } from "../state/stores"
import { FolderType } from "../types/enums"

export interface HistoryRecord {
    collection: number
    value: string
    folderType: FolderType
    scrollTo?: number
    

}

export class HistoryWrapper {
    constructor(private beforeChange: ()=>void) {
        window.addEventListener("popstate", this.onPopup);
        
    }

    add(rec: HistoryRecord) {
        history.pushState(rec, "", `#${rec.folderType === FolderType.SEARCH?"search:":""}${encodeURIComponent(rec.value)}`); //TODO - add hash to URL
    }

    private onPopup = (evt: PopStateEvent) => {
        const state = evt.state as HistoryRecord;
        this.beforeChange();
        if (state) {
            selectedCollection.set(state.collection);
            currentFolder.set({type: state.folderType, value: state.value, scrollTo: state.scrollTo})
        }
    }

    finish() {
        window.removeEventListener("popstate", this.onPopup)
    }
    
}