import { PendingItems } from "./playback-sync";


describe('PendingItems', () => {
  let pendingItems: PendingItems;

  beforeEach(() => {
    pendingItems = new PendingItems(10);
  });

  afterEach(() => {
    pendingItems.clear();
  });

  it('should add items', () => {
    const position = {
      filePath: 'file1',
      timestamp: new Date(),
      position: 10
    };

    pendingItems.add(position);

    expect(pendingItems.items.size).toBe(1);
  });

  it('should evict items when capacity is reached', () => {
    for (let i = 0; i < 15; i++) {
      const position = {
        filePath: 'file' + i,
        timestamp: new Date(),
        position: i
      };
    

    pendingItems.add(position);
    }
    expect(pendingItems.items.size).toBe(10);
    expect(pendingItems.items.has('file1')).toBeFalsy();
  });

  it('should get items newer than a given timestamp', () => {
    const position1 = {
      filePath: 'file1',
      timestamp: new Date('2022-01-01'),
      position: 10
    };
    const position2 = {
      filePath: 'file2',
      timestamp: new Date('2022-01-02'),
      position: 20
    };
    const position3 = {
      filePath: 'file3',
      timestamp: new Date('2022-01-03'),
      position: 30
    };

    pendingItems.add(position1);
    pendingItems.add(position2);
    pendingItems.add(position3);

    const newerItems = pendingItems.getNewerThan(new Date('2022-01-02'));

    expect(newerItems.length).toBe(2);
    expect(newerItems[0][0]).toBe('file2');
    expect(newerItems[1][0]).toBe('file3');
  });
});