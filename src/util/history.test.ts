import { FolderType } from "../types/enums";
import { constructHistoryFragment, parseHistoryFragment } from "./history";

//Mock localStorage

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};

test("regular fragment works", () => {
  const rec = {
    collection: 0,
    folderType: FolderType.REGULAR,
    value: "Doyle Arthur Conan/Advatures of Sherlock Holmes",
  };
  const hash = constructHistoryFragment(rec);
  const rec2 = parseHistoryFragment(hash);

  expect(rec2).not.toBeNull();
});
