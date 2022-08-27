export class Debouncer<T> {
  private timer: number;
  constructor(private callBack: (arg: T) => void, private interval: number) {}

  debounce(arg: T) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.callBack, this.interval, [arg]);
  }
}

export class Throttler<T> {
  private skip = false;
  constructor(private callBack: (arg: T) => void, private interval: number) {}

  throttle(arg: T) {
    if (this.skip) {
      return;
    }
    this.callBack(arg);
    this.skip = true;
    window.setTimeout(() => {
      this.skip = false;
    }, this.interval);
  }
}
