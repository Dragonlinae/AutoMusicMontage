var bandpassLowerFrequency = 1;
var bandpassUpperFrequency = 100;
var threshold = 0.5;
var beatSeparationLower = 0.1;
var beatSeparationUpper = 5;
var beatSignificanceCount = 1000;
const timeslice = 300;
var isGenerated = false;
var timePrev = 0;
var sigBeatFlash = null;
var loadedBuffer = null;
var loadedSong = null;
var sampleRate = sampleRate;

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
        canvasContainer.style.left = -document.getElementById("outputMusic").currentTime * sampleRate / timeslice + "px";
        if (sigBeatFlash[Math.round(document.getElementById("outputMusic").currentTime * 10)]) {
            console.log("flash");
            document.getElementById("outputMusic").style.backgroundColor = "#ff0000";
            setTimeout(function () {
                document.getElementById("outputMusic").style.backgroundColor = "#000000";
            }, 50);
        }
    }, 100);
    // document.getElementById("outputMusic").ontimeupdate = function () {
    //     console.log(document.getElementById("outputMusic").currentTime);
    //     var timeGap = document.getElementById("outputMusic").currentTime - timePrev;
    //     timePrev = document.getElementById("outputMusic").currentTime;
    //     timeGap = Math.min(Math.abs(timeGap), 0.5);
    //     canvasContainer.style.transition = "left " + timeGap + "s linear";
    //     canvasContainer.style.left = -document.getElementById("outputMusic").currentTime * sampleRate / timeslice + "px";
    // }
}

function bandpassFrequencyChange(isUpper, value) {
    var leftSlider = document.getElementById("bandpassSlider");
    var rightSlider = document.getElementById("bandpassSlider2");
    var leftSliderInput = document.getElementById("bandpassSliderInput");
    var rightSliderInput = document.getElementById("bandpassSliderInput2");
    value = Math.round(value);
    console.log(value);
    if (isUpper) {
        if (value <= bandpassLowerFrequency) {
            value = bandpassLowerFrequency + 1;
        }
        bandpassUpperFrequency = value;
        rightSlider.value = value;
        rightSliderInput.value = value;
    } else {
        if (value >= bandpassUpperFrequency) {
            value = bandpassUpperFrequency - 1;
        }
        if (value < 1) {
            value = 1;
        }
        bandpassLowerFrequency = value;
        leftSlider.value = value;
        leftSliderInput.value = value;
    }
}

function thresholdChange(value) {
    threshold = value;
    document.getElementById("thresholdSlider").value = value;
    document.getElementById("thresholdSliderInput").value = value;
}

function beatSepChange(isUpper, value) {
    var leftSlider = document.getElementById("beatSepSlider");
    var rightSlider = document.getElementById("beatSepSlider2");
    var leftSliderInput = document.getElementById("beatSepSliderInput");
    var rightSliderInput = document.getElementById("beatSepSliderInput2");
    value = Math.round(value * 10) / 10;
    if (isUpper) {
        if (value <= beatSeparationLower) {
            value = beatSeparationLower + 0.1;
            value = Math.round(value * 10) / 10;
        }
        beatSeparationUpper = value;
        rightSlider.value = value;
        rightSliderInput.value = value;
    } else {
        if (value >= beatSeparationUpper) {
            value = beatSeparationUpper - 0.1;
            value = Math.round(value * 10) / 10;
        }
        if (value < 0) {
            value = 0;
        }
        beatSeparationLower = value;
        leftSlider.value = value;
        leftSliderInput.value = value;
    }
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
        sampleRate = musicBuffer.sampleRate;
    }
    console.log("Getting bandpass buffer");
    const bandpassMusicBuffer = await bandpassFilter(loadedBuffer);
    console.log("Generating waveform");
    const waveform = loadedBuffer.getChannelData(0);
    const bandpassWaveform = bandpassMusicBuffer.getChannelData(0);
    console.log("Getting peaks");
    const { peaks, truepeaks } = getMusicPeaks(bandpassWaveform);
    console.log("Graphing waveform");
    await graphWaveform(waveform, bandpassWaveform, peaks, truepeaks);
    console.log("Completed");
    isGenerated = true;
}

function getMusicPeaks(waveform) {
    var peaks = new Array(waveform.length).fill(false);
    var truepeaks = new Array(waveform.length).fill(false);
    sigBeatFlash = new Array(Math.round(waveform.length / sampleRate * 10)).fill(false);

    var lastStrongPeak = 0;
    var lastPeak = 0
    var groupPeakCount = 0;
    var lastRecordedPeak = -1;

    for (let i = 0; i < waveform.length; i++) {
        if (Math.abs(waveform[i]) > threshold) {
            peaks[i] = true;
            if (i - lastStrongPeak > beatSeparationLower * sampleRate) {
                if (groupPeakCount > beatSignificanceCount) {
                    truepeaks[lastStrongPeak] = true;
                    sigBeatFlash[Math.round(lastStrongPeak * 10 / sampleRate)] = true;
                }
                lastRecordedPeak = lastStrongPeak;
                lastStrongPeak = i;
                lastPeak = i;
                groupPeakCount = 1;
            } else if (Math.abs(waveform[i]) > Math.abs(waveform[lastStrongPeak])) {
                lastStrongPeak = i;
                groupPeakCount += 1;
            } else {
                groupPeakCount += 1;
            }
        }
        if (i - lastRecordedPeak > beatSeparationUpper * sampleRate) {
            console.log("lastPeak: " + lastPeak);
            truepeaks[lastPeak] = true;
            sigBeatFlash[Math.round(lastPeak * 10 / sampleRate)] = true;
            lastRecordedPeak = lastPeak;
            for (; i + 1 < waveform.length && i < lastPeak + beatSeparationLower * sampleRate; i++) {
                if (Math.abs(waveform[i]) > threshold) {
                    peaks[i] = true;
                }
            }
            lastStrongPeak = i;
            lastPeak = i;
            groupPeakCount = 1;
        }
        if (Math.abs(waveform[i]) > Math.abs(waveform[lastPeak])) {
            lastPeak = i;
        }
    }
    if (groupPeakCount > beatSignificanceCount) {
        truepeaks[lastStrongPeak] = true;
        sigBeatFlash[Math.round(lastStrongPeak * 10 / sampleRate)] = true;
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
//         if (peak - lastStrongPeak > beatSeparation * sampleRate) {
//             if (groupPeakCount > beatSignificanceCount) {
//                 truepeaks.add(lastStrongPeak);
//                 sigBeatFlash.add(Math.round(lastStrongPeak * 10 / sampleRate));
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
//     sigBeatFlash.add(Math.round(lastStrongPeak * 10 / sampleRate));
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

function bandpassFilter(buffer) {
    const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    const filter = offlineContext.createBiquadFilter();
    filter.type = "bandpass";
    var geometricMean = Math.sqrt(bandpassLowerFrequency * bandpassUpperFrequency);
    filter.frequency.value = geometricMean;
    filter.Q.value = geometricMean / (bandpassUpperFrequency - bandpassLowerFrequency);
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


async function graphWaveform(waveform, bandpassWaveform, peaks, truepeaks) {
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

    const bandpassCanvas = document.getElementById("outputMusicCanvas");
    const bandpassCanvasContext = bandpassCanvas.getContext("2d");
    bandpassCanvasContext.fillStyle = "#000000";
    bandpassCanvasContext.fillRect(0, 0, bandpassCanvas.width, bandpassCanvas.height);
    var bandpassMaxPCM = 0;
    for (let i = 0; i < bandpassWaveform.length; i++) {
        if (Math.abs(bandpassWaveform[i]) > bandpassMaxPCM) {
            bandpassMaxPCM = Math.abs(bandpassWaveform[i]);
        }
    }

    for (let i = 0; i < bandpassCanvas.width; i++) {
        const x = i;
        var ylow = 0;
        var yhigh = 0;
        var isPeak = false;
        var isTruePeak = false;
        for (let j = 0; j < timeslice; j++) {
            const y = (bandpassWaveform[Math.round(i * timeslice + j)] / bandpassMaxPCM) * (bandpassCanvas.height / 3);
            if (y < ylow) {
                ylow = y;
            }
            if (y > yhigh) {
                yhigh = y;
            }
            if (peaks[Math.round(i * timeslice + j)]) {
                isPeak = true;
            }
            if (truepeaks[Math.round(i * timeslice + j)]) {
                isTruePeak = true;
            }
        }
        // if (i > 50000 && i < 50100) {
        //     console.log(y);
        // }

        if (isTruePeak) {
            bandpassCanvasContext.fillStyle = "#00ff00";
            bandpassCanvasContext.fillRect(x, 0, 1, bandpassCanvas.height);
            canvasContext.fillStyle = "#00ff00";
            canvasContext.fillRect(x, 0, 1, canvas.height);
        }
        bandpassCanvasContext.fillStyle = "#ffffff";
        if (isPeak) {
            bandpassCanvasContext.fillStyle = "#ff0000";
        }
        bandpassCanvasContext.fillRect(x, bandpassCanvas.height / 2 + ylow, 1, yhigh - ylow);
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