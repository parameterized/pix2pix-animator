
import { animator } from './index.js';
import { utils } from './utils.js';

export class Timeline {
    constructor(x, y, w) {
        let n = 7; // num frames shown
        let s = 20; // space between
        let bw = (w - s * (n - 1)) / n; // frame width (and height)
        this.boxes = [];
        for (let i = 0; i < n; i++) {
            this.boxes.push([x, y, bw, bw]);
            x += bw + s;
        }
    }

    mousePressed() {
        for (let i = 0; i < this.boxes.length; i++) {
            let b = this.boxes[i];
            let fi = i + this.offset;
            if (animator.frames[fi] && utils.mouseInRect(b)) {
                animator.activeFrame = fi;
            }
        }
    }

    draw() {
        this.offset = constrain(animator.activeFrame - floor(this.boxes.length / 2),
            0, animator.frames.length - this.boxes.length);
        fill('#83C5BE');
        for (let i = 0; i < this.boxes.length; i++) {
            let b = this.boxes[i];
            let fi = i + this.offset;
            if (animator.frames[fi]) {
                if (utils.mouseInRect(b)) {
                    utils.setPointer();
                }
                image(animator.frames[fi].canvas, ...b);
            } else {
                rect(...b);
            }
            if (animator.activeFrame === fi) {
                push();
                noFill();
                stroke('#83C5BE');
                strokeWeight(2);
                rect(...b);
                pop();
            }
        }
    }
}
