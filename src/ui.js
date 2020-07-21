
import { viewport } from './index.js';
import { utils } from './utils.js';

export class UI {
    text = [];
    buttons = [];
    sliders = [];

    addText(v) {
        // (text/getText), x, y, [c, textSize]
        v.c = v.c || color(0);
        v.textSize = v.textSize || 36;
        this.text.push(v);
        return v;
    }

    addButton(v) {
        // (text/getText), box, action(), [c1, c2, textSize]
        v.c1 = v.c1 || color('#83C5BE');
        v.c2 = v.c2 || color('#006D77');
        v.textSize = v.textSize || 30;
        this.buttons.push(v);
        return v;
    }

    addSlider(v) {
        // text, box, action(value), min, max, value, [c1, c2, textSize]
        v.label = v.text;
        v.text = `${v.label}: ${v.value}`;
        v.c1 = v.c1 || color('#83C5BE');
        v.c2 = v.c2 || color('#006D77');
        v.textSize = v.textSize || 30;
        this.sliders.push(v);
        return v;
    }

    mousePressed() {
        for (let v of this.buttons) {
            if (utils.mouseInRect(v.box) && v.action) {
                v.action();
            }
        }
        for (let v of this.sliders) {
            if (utils.mouseInRect(v.box)) {
                this.heldSlider = v;
            }
        }
    }

    mouseReleased() {
        this.heldSlider = null;
    }

    update(dt) {
        if (this.heldSlider) {
            let v = this.heldSlider;
            let t = (viewport.mouseX - v.box[0]) / v.box[2];
            let newValue = constrain(round(v.min + t * (v.max - v.min)), v.min, v.max);
            if (newValue !== v.value) {
                v.value = newValue;
                v.action(v.value);
                v.text = `${v.label}: ${v.value}`;
            }
        }
    }

    draw() {
        textAlign(CENTER, CENTER);
        for (let v of this.text) {
            fill(v.c);
            textSize(v.textSize);
            let t = v.text || v.getText();
            text(t, v.x, v.y + 3); // todo: better text centering
        }
        for (let v of this.buttons) {
            if (utils.mouseInRect(v.box)) {
                utils.setPointer();
                fill(v.c2);
            } else {
                fill(v.c1);
            }
            rect(...v.box);
            fill(255);
            let b = v.box;
            let bx = b[0], by = b[1], bw = b[2], bh = b[3];
            textSize(v.textSize);
            let t = v.text || v.getText();
            text(t, bx + bw / 2, by + bh / 2 + 3);
        }
        for (let v of this.sliders) {
            if (utils.mouseInRect(v.box)) {
                utils.setPointer();
            }
            fill(v.c1);
            rect(...v.box);
            fill(v.c2);
            let t = (v.value - v.min) / (v.max - v.min);
            rect(v.box[0], v.box[1], v.box[2] * t, v.box[3]);
            fill(255);
            let b = v.box;
            let bx = b[0], by = b[1], bw = b[2], bh = b[3];
            textSize(v.textSize);
            text(v.text, bx + bw / 2, by + bh / 2 + 3);
        }
    }
}
