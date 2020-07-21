
import * as tf from '@tensorflow/tfjs';
import { targetWidth, targetHeight, viewport } from './index.js';
import { Frame } from './frame.js';
import { Timeline } from './timeline.js';
import { UI } from './ui.js';
import { TestNorm } from './testNorm.js';
import { utils } from './utils.js';

export class Animator {
    brush = 'draw';
    fps = 12;
    frameTimer = 0;
    playing = false;

    constructor() {
        let cx = targetWidth / 2;
        let cy = targetHeight / 2;
        let w = 512, h = 512;
        let sep = 50;
        this.canvasBox = [cx - w - sep / 2, 100, w, h];
        this.outputBox = [cx + sep / 2, 100, w, h];

        this.frames = [new Frame()];
        this.activeFrame = 0;

        this.timeline = new Timeline(
            this.canvasBox[0], this.canvasBox[1] + this.canvasBox[3] + 30,
            this.outputBox[0] + this.outputBox[2] - this.canvasBox[0]
        );

        this.ui = new UI();
        this.ui.addText({ text: 'Pix2Pix Animator', x: targetWidth / 2, y: 50 });

        let b = this.outputBox;
        this.ui.addButton({
            text: 'Export to GIF', box: [b[0] + b[2] - 200 - 10, 25, 200, 50], action: () => {
                let gif = new GIF({ workerScript: 'lib/gif.worker.js' });
                for (let f of this.frames) {
                    gif.addFrame(f.output.canvas, { delay: 1000 / this.fps });
                }
                gif.on('finished', blob => {
                    window.open(URL.createObjectURL(blob));
                });
                gif.render();
            }
        });

        b = this.canvasBox;
        w = 150, h = 50;
        this.ui.addButton({
            text: 'Clear', box: [b[0] - 20 - w, b[1] + 10, w, h], action: () => {
                let f = this.frames[this.activeFrame];
                f.strokes = [];
                f.updateCanvas();
                f.predict();
            }
        });
        this.drawButton = this.ui.addButton({
            text: 'Draw', box: [b[0] - 20 - w, b[1] + 10 + (h + 10), w, h], action: () => {
                this.brush = 'draw';
                this.drawButton.c1 = color('#006D77');
                this.eraseButton.c1 = color('#83C5BE');
            }, c1: color('#006D77')
        });
        this.eraseButton = this.ui.addButton({
            text: 'Erase', box: [b[0] - 20 - w, b[1] + 10 + (h + 10) * 2, w, h], action: () => {
                this.brush = 'erase';
                this.drawButton.c1 = color('#83C5BE');
                this.eraseButton.c1 = color('#006D77');
            }
        });
        this.undoButton = this.ui.addButton({
            text: 'Undo', box: [b[0] - 20 - w, b[1] + 10 + (h + 10) * 3, w, h], action: () => {
                let f = this.frames[this.activeFrame];
                f.strokes.pop();
                if (this.lastPos) {
                    f.strokes.push({ brush: this.brush, points: [this.lastPos] });
                }
                f.updateCanvas();
                f.predict();
            }
        });

        this.addButton = this.ui.addButton({
            text: 'Add', box: [b[0] - 20 - w, b[1] + b[3] + 30 + 10, w, h], action: () => {
                this.frames.splice(this.activeFrame + 1, 0, new Frame());
                this.activeFrame++;
            }
        });
        this.ui.addButton({
            text: 'Remove', box: [b[0] - 20 - w, b[1] + b[3] + 30 + 10 + (h + 10), w, h], action: () => {
                if (this.frames.length > 1) {
                    this.frames.splice(this.activeFrame, 1)
                    this.activeFrame = min(this.activeFrame, this.frames.length - 1);
                }
            }
        });

        this.ui.addSlider({
            text: 'FPS', box: [targetWidth / 2 - w - sep / 2, 800, w, h], action: v => {
                this.fps = v;
            }, min: 4, max: 24, value: this.fps
        });
        this.playButton = this.ui.addButton({
            getText: () => this.playing ? 'Pause' : 'Play', box: [targetWidth / 2 + sep / 2, 800, w, h], action: () => {
                this.playing = !this.playing;
                this.frameTimer = 0;
            }
        });

        this.loadModel();
    }

    async loadModel() {
        let m = await tf.loadLayersModel('models/cats_model2/model.json');
        // replace batch norm with custom layer that doesn't use moving averages for inference
        let newInput = tf.input({ shape: [256, 256, 3] });
        let applyInbound = l => {
            let lin = l.getInputAt(0);
            if (l.getClassName() === 'BatchNormalization') {
                l = new TestNorm(l);
            }
            if (l.getClassName() === 'InputLayer') {
                return newInput;
            }
            if (lin.length) { // multiple inputs
                for (let i = 0; i < lin.length; i++) {
                    let v = lin[i];
                    lin[i] = applyInbound(v.sourceLayer);
                }
            } else {
                lin = applyInbound(lin.sourceLayer);
            }
            return l.apply(lin);
        }
        m = tf.model({ inputs: newInput, outputs: applyInbound(m.layers[m.layers.length - 1]) });
        // build model
        tf.dispose(tf.tidy(() => m.predict(tf.zeros([1, 256, 256, 3]))));
        this.model = m;
    }

    getMouseCanvasPos() {
        viewport.updateMouse();
        let b = this.canvasBox;
        return [(viewport.mouseX - b[0]) / b[2] * 256, (viewport.mouseY - b[1]) / b[3] * 256];
    }

    mousePressed() {
        this.ui.mousePressed();
        this.timeline.mousePressed();
        if (utils.mouseInRect(this.canvasBox)) {
            this.lastPos = this.getMouseCanvasPos();
            this.frames[this.activeFrame].strokes.push({ brush: this.brush, points: [this.lastPos] });
        }
    }
    
    mouseReleased() {
        this.ui.mouseReleased();
        let f = this.frames[this.activeFrame];
        let s = f.strokes;
        if (s.length > 0 && s[s.length - 1].points.length === 1) {
            s.pop();
        } else if (this.lastPos) {
            f.predict();
        }
        this.lastPos = null;
    }

    keyPressed() {
        switch (keyCode) {
            case 68: // D
                this.drawButton.action();
                break;
            case 69: // E
                this.eraseButton.action();
                break;
            case 39: // Right Arrow
                this.activeFrame = utils.mod(this.activeFrame + 1, this.frames.length);
                break;
            case 37: // Left Arrow
                this.activeFrame = utils.mod(this.activeFrame - 1, this.frames.length);
                break;
            case 32: // Space
                this.playButton.action();
                break;
            case 78: // N
                this.addButton.action();
                break;
            case 90: // Z
                if (keyIsDown(17)) { // Ctrl
                    this.undoButton.action();
                }
                break;
        }
    }

    update(dt) {
        this.ui.update(dt);
        if (mouseIsPressed && this.lastPos) {
            let p1 = this.lastPos;
            let p2 = this.getMouseCanvasPos();
            if (dist(...p1, ...p2) > 0) {
                let f = this.frames[this.activeFrame];
                let s = f.strokes;
                if (s.length > 0) {
                    s[s.length - 1].points.push(p2);
                }
                this.lastPos = p2;
                f.updateCanvas();
            }
        }
        if (this.playing) {
            this.frameTimer -= dt * this.fps;
            if (this.frameTimer < 0) {
                this.frameTimer += 1;
                this.activeFrame = utils.mod(this.activeFrame + 1, this.frames.length);
            }
        }
    }

    draw() {
        let lastFrame = this.frames[utils.mod(this.activeFrame - 1, this.frames.length)];
        this.frames[this.activeFrame].draw(lastFrame);

        if (!this.model) {
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(24);
            let b = this.outputBox;
            text('Loading model...', b[0] + b[2] / 2, b[1] + b[3] / 2);
        }

        this.timeline.draw();

        this.ui.draw();
    }
}
