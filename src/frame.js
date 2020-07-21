
import * as tf from '@tensorflow/tfjs';
import { gfx, animator } from './index.js';
import { utils } from './utils.js';

export class Frame {
    canvas = createGraphics(256, 256);
    output = createGraphics(256, 256);
    strokes = [];

    constructor() {
        let c = this.canvas;
        c.background(255);
        c.noFill();

        (this.onion = c.get()).mask(gfx.onionMask);

        this.output.background(255);
        this.output.loadPixels();
    }

    async predict() {
        this.canvas.loadPixels();
        let imageData = new ImageData(this.canvas.pixels, 256, 256);
        if (animator.model) {
            let y = tf.tidy(() => {
                let x = tf.browser.fromPixels(imageData).toFloat();
                x = x.div(127.5).sub(1).expandDims(0);
                return animator.model.predict(x).squeeze().mul(0.5).add(0.5);
            });
            let outputImage = await tf.browser.toPixels(y);
            tf.dispose(y);
            utils.copyPixels(outputImage, this.output.pixels);
            this.output.updatePixels();
        }
        (this.onion = this.canvas.get()).mask(gfx.onionMask);
    }

    updateCanvas() {
        let c = this.canvas;
        c.background(255);
        for (let s of this.strokes) {
            c.stroke(s.brush === 'draw' ? 0 : 255);
            c.strokeWeight(s.brush === 'draw' ? 1 : 5);
            c.beginShape();
            for (let v of s.points) {
                c.vertex(...v);
            }
            c.endShape();
        }
    }

    draw(lastFrame) {
        image(this.canvas, ...animator.canvasBox);
        image(lastFrame.onion, ...animator.canvasBox);
        image(this.output, ...animator.outputBox);
    }
}
