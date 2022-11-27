import { encodePathParameter } from ".";

describe("audio path encoding", () => {
  test("encodes only parameter", () => {
    const res = encodePathParameter("/0/audio/test?#");
    expect(res).toEqual("/0/audio/test%3F%23");
  });
});
