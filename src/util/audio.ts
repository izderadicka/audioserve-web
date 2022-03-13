export async function loadAudioFile(filepath: string, audioCtx: AudioContext) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }

export function playBuffer(track: AudioBuffer, audioCtx: AudioContext) {
        const trackSource = audioCtx.createBufferSource();
        trackSource.buffer = track;
        trackSource.connect(audioCtx.destination)
        trackSource.start();
}

export function createAudioContext(): AudioContext {
    const AudioContext = window.AudioContext; //|| window.webkitAudioContext;
    const ac = new AudioContext();
    if (ac.state === 'suspended') {
        ac.resume();
    }
    return ac
}