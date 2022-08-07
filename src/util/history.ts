import { currentFolder, selectedCollection } from "../state/stores";
import { FolderType } from "../types/enums";

export interface HistoryRecord {
  collection: number;
  value: string;
  folderType: FolderType;
  scrollTo?: number;
}

function historyEq(me: HistoryRecord, other: HistoryRecord): boolean {
  return (
    me.collection === other.collection &&
    me.folderType === other.folderType &&
    me.value === other.value
  );
}

export function constructHistoryFragment(rec: HistoryRecord): string {
  return `#${rec.collection}/${
    rec.folderType === FolderType.SEARCH ? "search:" : ""
  }${encodeURIComponent(rec.value)}`;
}

export function parseHistoryFragment(s: string): HistoryRecord | null {
  const res = /(\d+)\/(search:)?(.*)/.exec(s);
  if (res) {
    const collection = Number(res[0]);
    const folderType = res[1] ? FolderType.SEARCH : FolderType.REGULAR;

    return {
      folderType,
      collection,
      value: res[2],
    };
  } else {
    return null;
  }
}

export class HistoryWrapper {
  constructor(private beforeChange: () => void) {
    window.addEventListener("popstate", this.onPopup);
  }

  update(rec: HistoryRecord) {
    if (rec && history.state && historyEq(history.state, rec)) {
      window.history.replaceState(rec, "");
    }
  }

  add(rec: HistoryRecord) {
    if (rec && (!history.state || !historyEq(history.state, rec))) {
      history.pushState(rec, "", constructHistoryFragment(rec));
    }
  }

  private onPopup = (evt: PopStateEvent) => {
    const state = evt.state as HistoryRecord;
    this.beforeChange();
    if (state) {
      selectedCollection.set(state.collection);
      currentFolder.set({
        type: state.folderType,
        value: state.value,
        scrollTo: state.scrollTo,
      });
    }
  };

  finish() {
    window.removeEventListener("popstate", this.onPopup);
  }
}
