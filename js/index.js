var lowpassFrequency = 1000;
var threshold = 0.7
const timeslice = 100;
var isGenerated = false;
var timePrev = 0;

window.onload = function () {
    const canvasContainer = document.getElementById("outputMusicCanvasContainer");
    setInterval(function () {
        if (!isGenerated || document.getElementById("outputMusic").currentTime == timePrev) {
            return;
        }
        console.log(document.getElementById("outputMusic").currentTime);
        var timeGap = document.getElementById("outputMusic").currentTime - timePrev;
        timePrev = document.getElementById("outputMusic").currentTime;
        timeGap = Math.min(Math.abs(timeGap), 0.5);
        canvasContainer.style.transition = "left " + timeGap + "s linear";
        canvasContainer.style.left = -document.getElementById("outputMusic").currentTime * 44100 / timeslice + "px";
    }, 100);
    // document.getElementById("outputMusic").ontimeupdate = function () {
    //     console.log(document.getElementById("outputMusic").currentTime);
    //     var timeGap = document.getElementById("outputMusic").currentTime - timePrev;
    //     timePrev = document.getElementById("outputMusic").currentTime;
    //     timeGap = Math.min(Math.abs(timeGap), 0.5);
    //     canvasContainer.style.transition = "left " + timeGap + "s linear";
    //     canvasContainer.style.left = -document.getElementById("outputMusic").currentTime * 44100 / timeslice + "px";
    // }
}

function lowpassFrequencyUpdate(value) {
    lowpassFrequency = value;
    document.getElementById("lowpassSliderInput").value = value;
}

function lowpassFrequencyChange(value) {
    lowpassFrequency = value;
    document.getElementById("lowpassSlider").value = value;
    document.getElementById("lowpassSliderInput").value = value;
    if (isGenerated) {
        generate();
    }
}

function thresholdUpdate(value) {
    document.getElementById("thresholdSliderInput").value = value;
}

function thresholdChange(value) {
    document.getElementById("thresholdSlider").value = value;
    document.getElementById("thresholdSliderInput").value = value;
    if (isGenerated) {
        generate();
    }
}

function musicUpload() {
    const file = document.getElementById("inputMusic").files[0];
    document.getElementById("outputMusic").src = URL.createObjectURL(file);
}

function videoUpload() {
    const file = document.getElementById("inputVideo").files[0];
    document.getElementById("outputVideo").src = URL.createObjectURL(file);
}

async function generate() {
    const musicFile = document.getElementById("inputMusic").files[0];
    const videoFiles = document.getElementById("inputVideo").files;

    const musicBuffer = await getMusicBuffer(musicFile);
    const lowpassMusicBuffer = await lowPassFilter(musicBuffer);
    const waveform = musicBuffer.getChannelData(0);
    const lowpassWaveform = lowpassMusicBuffer.getChannelData(0);
    await graphWaveform(waveform, lowpassWaveform);
    isGenerated = true;
}

function getMusicPeaks(waveform) {
}

function resizeCanvas(length) {
    const canvas = document.getElementById("outputMusicCanvas");
    const canvas2 = document.getElementById("outputMusicCanvas2");
    if (canvas.width == length) {
        return;
    }
    canvas.width = length;
    canvas2.width = length;
}

async function getMusicBuffer(musicFile) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = function (e) {
            audioContext.decodeAudioData(e.target.result, async function (buffer) {
                console.log(buffer);
                resolve(buffer);
            });
            console.log("done");
        };
        reader.readAsArrayBuffer(musicFile);
    });
}

function lowPassFilter(buffer) {
    const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    const filter = offlineContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpassFrequency;
    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);
    offlineContext.startRendering();
    return new Promise((resolve) => {
        offlineContext.oncomplete = function (e) {
            const buffer = e.renderedBuffer;
            resolve(buffer);
        };
    });
}


async function graphWaveform(waveform, lowpassWaveform) {
    var maxPCM = 0;
    for (let i = 0; i < waveform.length; i++) {
        if (Math.abs(waveform[i]) > maxPCM) {
            maxPCM = Math.abs(waveform[i]);
        }
    }
    console.log(maxPCM);
    console.log(waveform.length);

    const canvas = document.getElementById("outputMusicCanvas2");
    const canvasContext = canvas.getContext("2d");

    console.log(timeslice);
    await resizeCanvas(Math.floor(waveform.length / timeslice));

    canvasContext.fillStyle = "#000000";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < canvas.width; i++) {
        const x = i;
        var ylow = 0;
        var yhigh = 0;
        for (let j = 0; j < timeslice; j++) {
            const y = (waveform[Math.round(i * timeslice + j)] / maxPCM) * (canvas.height / 2);
            if (y < ylow) {
                ylow = y;
            }
            if (y > yhigh) {
                yhigh = y;
            }
        }
        // if (i > 50000 && i < 50100) {
        //     console.log(y);
        // }
        canvasContext.fillStyle = "#ffffff";
        canvasContext.fillRect(x, canvas.height / 2 + ylow, 1, yhigh - ylow);
    }

    const lowpassCanvas = document.getElementById("outputMusicCanvas");
    const lowpassCanvasContext = lowpassCanvas.getContext("2d");
    lowpassCanvasContext.fillStyle = "#000000";
    lowpassCanvasContext.fillRect(0, 0, lowpassCanvas.width, lowpassCanvas.height);
    var maxPCM = 0;
    for (let i = 0; i < lowpassWaveform.length; i++) {
        if (Math.abs(lowpassWaveform[i]) > maxPCM) {
            maxPCM = Math.abs(lowpassWaveform[i]);
        }
    }
    console.log(maxPCM);
    console.log(lowpassWaveform.length);

    console.log(timeslice);

    for (let i = 0; i < lowpassCanvas.width; i++) {
        const x = i;
        var ylow = 0;
        var yhigh = 0;
        for (let j = 0; j < timeslice; j++) {
            const y = (lowpassWaveform[Math.round(i * timeslice + j)] / maxPCM) * (lowpassCanvas.height / 2);
            if (y < ylow) {
                ylow = y;
            }
            if (y > yhigh) {
                yhigh = y;
            }
        }
        // if (i > 50000 && i < 50100) {
        //     console.log(y);
        // }
        lowpassCanvasContext.fillStyle = "#ffffff";
        lowpassCanvasContext.fillRect(x, lowpassCanvas.height / 2 + ylow, 1, yhigh - ylow);
    }
    // const peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)]);
    // console.log(peaks);
    // return peaks;
}