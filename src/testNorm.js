
import * as tf from '@tensorflow/tfjs';

export class TestNorm extends tf.layers.Layer {
    constructor(bnLayer) {
        super({});
        this.gamma = bnLayer.weights[0].val;
        this.beta = bnLayer.weights[1].val;
        this.epsilon = bnLayer.epsilon;
    }

    call(input) {
        input = input[0];
        return tf.tidy(() => {
            let mv = tf.moments(input, [1, 2], true);
            let tileShape = [1, input.shape[1], input.shape[2], 1];
            let y = input.sub(mv.mean.tile(tileShape));
            y = y.div(mv.variance.add(this.epsilon).sqrt().tile(tileShape));
            y = y.mul(this.gamma).add(this.beta);
            return y;
        });
    }

    static get className() {
        return 'TestNorm';
    }
}
