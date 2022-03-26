export enum ShakeType {
    Orientation,
    Motion,
  }
  
  type CBtype = (how: ShakeType) => void;
  
  export class Orientation {
    constructor(
      public alpha: number,
      public beta: number,
      public gamma: number
    ) {}
  
    get maxAbs() {
      return Math.max(
        Math.abs(this.alpha),
        Math.abs(this.beta),
        Math.abs(this.gamma)
      );
    }
  
    private sub(first: number, second: number, max: number) {
      const diff = Math.abs(first - second);
      if (diff > max) {
        return 2 * max - diff;
      } else {
        return diff;
      }
    }
  
    delta(other: Orientation) {
      return new Orientation(
        this.sub(this.alpha, other.alpha, 180),
        this.sub(this.beta, other.beta, 180),
        this.sub(this.gamma, other.gamma, 90)
      );
    }
  
    toString() {
      return `a: ${this.alpha.toFixed(2)}; b:${this.beta.toFixed(
        2
      )}; g: ${this.gamma.toFixed(2)}`;
    }
  }
  
  export class ShakeDetector {
    private cb: CBtype;
    private startOrientation: Orientation = null;
    private onOrientationChange = (evt: DeviceOrientationEvent) => {
      if (this.startOrientation == null) {
        this.startOrientation = new Orientation(evt.alpha, evt.beta, evt.gamma);
      } else {
        const newOrientation = new Orientation(evt.alpha, evt.beta, evt.gamma);
        const delta = this.startOrientation.delta(newOrientation).maxAbs;
  
        if (delta >= 45) {
          this.cb(ShakeType.Orientation);
          this.finish()
        }
        
      }
    };
  
    private onMotion = (evt: DeviceMotionEvent) => {
      if (
        !evt.acceleration ||
        evt.acceleration.x == null ||
        evt.acceleration.y == null ||
        !evt.acceleration.z == null
      ) {
        console.debug(
          "Motion event does not have valid data, stop using it",
          evt
        );
        window.removeEventListener("devicemotion", this.onMotion);
        return;
      }
  
      const totalAcceleration = Math.sqrt(
        evt.acceleration.x * evt.acceleration.x +
          evt.acceleration.y * evt.acceleration.y +
          evt.acceleration.z * evt.acceleration.z
      );
      if (totalAcceleration > this.accelerationLimit) {
        this.cb(ShakeType.Motion);
        this.finish();
      }
    };
  
    constructor(
      callback: CBtype,
      private accelerationLimit = 20,
      private orientationChange = 45
    ) {
      this.cb = callback;
      window.addEventListener("deviceorientation", this.onOrientationChange);
      window.addEventListener("devicemotion", this.onMotion);
    }
  
    finish() {
      window.removeEventListener("deviceorientation", this.onOrientationChange);
      window.removeEventListener("devicemotion", this.onMotion);
    }
  }
  