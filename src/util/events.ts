export class Debouncer<T> {
    private timer: number;
    constructor(private callBack: (arg:T) => void, private interval: number) {}

    debounce(arg: T) {
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(this.callBack, this.interval, [arg]);
    }
}