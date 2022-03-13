export enum ShakeType {
    OrientationChange
}

type CBtype = (how: ShakeType)=>void;

export class ShakeDetector {

    private cb: CBtype;

    constructor(callback: CBtype) {
        this.cb = callback;
        if ("orientation" in window.screen) {
            window.screen.orientation.addEventListener("change", (evt) => {
                this.cb(ShakeType.OrientationChange);
            }, {once: true});
        }
    }

    finish() {}



}