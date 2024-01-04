var lowpassFrequency = 1000;
var threshold = 0.7
var beatSeparation = 0.2;
var beatSignificanceCount = 1000;
const timeslice = 300;
var isGenerated = false;
var timePrev = 0;
var sigBeatFlash = null;
var loadedBuffer = null;
var loadedSong = null;

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
        if (sigBeatFlash[Math.round(document.getElementById("outputMusic").currentTime * 10)]) {
            console.log("flash");
            document.getElementById("outputMusic").style.backgroundColor = "#ff0000";
            setTimeout(function () {
                document.getElementById("outputMusic").style.backgroundColor = "#000000";
            }, 100);
        }
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
}

function thresholdUpdate(value) {
    document.getElementById("thresholdSliderInput").value = value;
}

function thresholdChange(value) {
    threshold = value;
    document.getElementById("thresholdSlider").value = value;
    document.getElementById("thresholdSliderInput").value = value;
}

function beatSepUpdate(value) {
    document.getElementById("beatSepSliderInput").value = value;
}

function beatSepChange(value) {
    beatSeparation = value;
    document.getElementById("beatSepSlider").value = value;
    document.getElementById("beatSepSliderInput").value = value;
}

function beatSigUpdate(value) {
    document.getElementById("beatSigSliderInput").value = value;
}

function beatSigChange(value) {
    beatSignificanceCount = value;
    document.getElementById("beatSigSlider").value = value;
    document.getElementById("beatSigSliderInput").value = value;
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
    console.log("Fetching");
    const musicFile = document.getElementById("inputMusic").files[0];
    const videoFiles = document.getElementById("inputVideo").files;
    if (loadedSong != musicFile.name) {
        console.log("Getting music buffer");
        const musicBuffer = await getMusicBuffer(musicFile);
        loadedSong = musicFile.name;
        loadedBuffer = musicBuffer;
    }
    console.log("Getting lowpass buffer");
    const lowpassMusicBuffer = await lowPassFilter(loadedBuffer);
    console.log("Generating waveform");
    const waveform = loadedBuffer.getChannelData(0);
    const lowpassWaveform = lowpassMusicBuffer.getChannelData(0);
    console.log("Getting peaks");
    const { peaks, truepeaks } = getMusicPeaks(waveform);
    console.log("Graphing waveform");
    await graphWaveform(waveform, lowpassWaveform, peaks, truepeaks);
    console.log("Completed");
    isGenerated = true;
}

function getMusicPeaks(waveform) {
    var peaks = new Array(waveform.length).fill(false);
    var truepeaks = new Array(waveform.length).fill(false);
    sigBeatFlash = new Array(Math.round(waveform.length / 44100 * 10)).fill(false);

    var lastStrongPeak = 0;
    var lastPeak = 0
    var groupPeakCount = 0;

    for (let i = 0; i < waveform.length; i++) {
        if (Math.abs(waveform[i]) > threshold) {
            peaks[i] = true;
            if (i - lastStrongPeak > beatSeparation * 44100) {
                if (groupPeakCount > beatSignificanceCount) {
                    truepeaks[lastStrongPeak] = true;
                    sigBeatFlash[Math.round(lastStrongPeak * 10 / 44100)] = true;
                }
                lastPeak = i;
                lastStrongPeak = i;
                groupPeakCount = 1;
            } else if (Math.abs(waveform[i]) > Math.abs(waveform[lastStrongPeak])) {
                lastStrongPeak = i;
                lastPeak = i;
                groupPeakCount += 1;
            } else {
                lastPeak = i;
                groupPeakCount += 1;
            }
        }
    }
    if (groupPeakCount > beatSignificanceCount) {
        truepeaks[lastStrongPeak] = true;
        sigBeatFlash[Math.round(lastStrongPeak * 10 / 44100)] = true;
    }
    return { peaks, truepeaks };
}

// function filterMusicPeaks(waveform, peaks) {
//     sigBeatFlash.clear();
//     var truepeaks = new Set();
//     var lastStrongPeak = peaks.values().next().value;
//     var lastPeak = lastStrongPeak
//     var groupPeakCount = 0;
//     for (let peak of peaks) {
//         if (peak - lastStrongPeak > beatSeparation * 44100) {
//             if (groupPeakCount > beatSignificanceCount) {
//                 truepeaks.add(lastStrongPeak);
//                 sigBeatFlash.add(Math.round(lastStrongPeak * 10 / 44100));
//             }
//             lastPeak = peak;
//             lastStrongPeak = peak;
//             groupPeakCount = 1;
//         } else if (Math.abs(waveform[peak]) > Math.abs(waveform[lastStrongPeak])) {
//             lastStrongPeak = peak;
//             lastPeak = peak;
//             groupPeakCount += 1;
//         } else {
//             lastPeak = peak;
//             groupPeakCount += 1;
//         }
//     }
//     truepeaks.add(lastStrongPeak);
//     sigBeatFlash.add(Math.round(lastStrongPeak * 10 / 44100));
//     return truepeaks;
// }

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


async function graphWaveform(waveform, lowpassWaveform, peaks, truepeaks) {
    var maxPCM = 0;
    for (let i = 0; i < waveform.length; i++) {
        if (Math.abs(waveform[i]) > maxPCM) {
            maxPCM = Math.abs(waveform[i]);
        }
    }

    const canvas = document.getElementById("outputMusicCanvas2");
    const canvasContext = canvas.getContext("2d");

    console.log(timeslice);
    await resizeCanvas(Math.floor(waveform.length / timeslice));

    canvasContext.fillStyle = "#000000";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    const lowpassCanvas = document.getElementById("outputMusicCanvas");
    const lowpassCanvasContext = lowpassCanvas.getContext("2d");
    lowpassCanvasContext.fillStyle = "#000000";
    lowpassCanvasContext.fillRect(0, 0, lowpassCanvas.width, lowpassCanvas.height);
    var lowpassMaxPCM = 0;
    for (let i = 0; i < lowpassWaveform.length; i++) {
        if (Math.abs(lowpassWaveform[i]) > lowpassMaxPCM) {
            lowpassMaxPCM = Math.abs(lowpassWaveform[i]);
        }
    }

    for (let i = 0; i < lowpassCanvas.width; i++) {
        const x = i;
        var ylow = 0;
        var yhigh = 0;
        var isPeak = false;
        var isTruePeak = false;
        for (let j = 0; j < timeslice; j++) {
            const y = (lowpassWaveform[Math.round(i * timeslice + j)] / lowpassMaxPCM) * (lowpassCanvas.height / 3);
            if (y < ylow) {
                ylow = y;
            }
            if (y > yhigh) {
                yhigh = y;
            }
            if (peaks[Math.round(i * timeslice + j)]) {
                isPeak = true;
                if (truepeaks[Math.round(i * timeslice + j)]) {
                    isTruePeak = true;
                }
            }
        }
        // if (i > 50000 && i < 50100) {
        //     console.log(y);
        // }
        lowpassCanvasContext.fillStyle = "#ffffff";
        if (isPeak) {
            if (isTruePeak) {
                lowpassCanvasContext.fillStyle = "#00ff00";
                lowpassCanvasContext.fillRect(x, 0, 1, lowpassCanvas.height);
                canvasContext.fillStyle = "#00ff00";
                canvasContext.fillRect(x, 0, 1, canvas.height);
            }
            lowpassCanvasContext.fillStyle = "#ff0000";
        }
        lowpassCanvasContext.fillRect(x, lowpassCanvas.height / 2 + ylow, 1, yhigh - ylow);
    }

    for (let i = 0; i < canvas.width; i++) {
        const x = i;
        var ylow = 0;
        var yhigh = 0;
        for (let j = 0; j < timeslice; j++) {
            const y = (waveform[Math.round(i * timeslice + j)] / maxPCM) * (canvas.height / 3);
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
}