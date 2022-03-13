export enum ShakeType {
    OrientationChange
}

type CBtype = (how: ShakeType)=>void;

export class ShakeDetector {

    private cb: CBtype;
    private onOrientationChange = (evt) => {
        this.cb(ShakeType.OrientationChange);
    };

    constructor(callback: CBtype) {
        this.cb = callback;
        if ("orientation" in window.screen) {
            window.screen.orientation.addEventListener("change", this.onOrientationChange, {once: true});
        }
    }

    finish() {
        if ("orientation" in window.screen) {
            window.screen.orientation.removeEventListener("change", this.onOrientationChange)
        }
    }



}