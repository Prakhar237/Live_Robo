// public/audio-processor.worklet.js
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // 128ms at 16000Hz (approx 7.8 chunks per second)
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];
        for (let i = 0; i < channelData.length; i++) {
            this.buffer[this.bufferIndex++] = channelData[i];
            if (this.bufferIndex >= this.bufferSize) {
                // Send a copy to the main thread
                this.port.postMessage(this.buffer.slice());
                this.bufferIndex = 0;
            }
        }
        return true; // Keep processor alive
    }
}
registerProcessor('pcm-processor', PCMProcessor);
