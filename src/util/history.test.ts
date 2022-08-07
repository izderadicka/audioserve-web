import { FolderType } from "../types/enums";
import { constructHistoryFragment, parseHistoryFragment } from "./history";

describe("history fragments", () => {
  test("regular folders works", () => {
    const rec = {
      collection: 0,
      folderType: FolderType.REGULAR,
      value: "Doyle Arthur Conan/Adventures of Sherlock Holmes",
    };
    const hash = constructHistoryFragment(rec);
    const rec2 = parseHistoryFragment(hash);

    expect(rec2).not.toBeNull();
    expect(rec2).toEqual(rec);
  });

  test("search folders works", () => {
    const rec = {
      collection: 1,
      folderType: FolderType.SEARCH,
      value: "Holmes",
    };
    const hash = constructHistoryFragment(rec);
    const rec2 = parseHistoryFragment(hash);

    expect(rec2).not.toBeNull();
    expect(rec2).toEqual(rec);
  });

  test("malformed parsing", () => {
    const res = parseHistoryFragment("#abraka");
    expect(res).toBeNull();
  });
});
