var lowpassFrequency = 1000;
var generated = false;

document.getElementById("outputMusic").ontimeupdate = function () {
    console.log(document.getElementById("outputMusic").currentTime);
    document.getElementById("outputMusicCanvas").style.left = 1
    document.getElementById("outputMusicCanvas2").style.left = 1
}

function lowpassFrequencyUpdate(value) {
    lowpassFrequency = value;
    document.getElementById("lowpassSliderInput").value = value;
}

function lowpassFrequencyChange(value) {
    lowpassFrequency = value;
    document.getElementById("lowpassSlider").value = value;
    document.getElementById("lowpassSliderInput").value = value;
    if (generated) {
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

function generate() {
    const musicFile = document.getElementById("inputMusic").files[0];
    const videoFiles = document.getElementById("inputVideo").files;

    const musicPeaks = getMusicPeaks(musicFile);
    generated = true;
}

function getMusicPeaks(musicFile) {
    const waveform = getMusicWaveform(musicFile);
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

function getMusicWaveform(musicFile) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const reader = new FileReader();
    reader.onload = function (e) {
        audioContext.decodeAudioData(e.target.result, async function (buffer) {
            const channelData = buffer.getChannelData(0);

            var maxPCM = 0;
            for (let i = 0; i < channelData.length; i++) {
                if (Math.abs(channelData[i]) > maxPCM) {
                    maxPCM = Math.abs(channelData[i]);
                }
            }
            console.log(maxPCM);
            console.log(channelData.length);

            const canvas = document.getElementById("outputMusicCanvas2");
            const canvasContext = canvas.getContext("2d");
            const timeslice = 100;
            console.log(timeslice);
            await resizeCanvas(Math.floor(channelData.length / timeslice));

            canvasContext.fillStyle = "#000000";
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < canvas.width; i++) {
                const x = i;
                var ylow = 0;
                var yhigh = 0;
                for (let j = 0; j < timeslice; j++) {
                    const y = (channelData[Math.round(i * timeslice + j)] / maxPCM) * (canvas.height / 2);
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
            offlineContext.oncomplete = function (e) {
                const buffer = e.renderedBuffer;

                const channelData = buffer.getChannelData(0);
                const canvas = document.getElementById("outputMusicCanvas");
                const canvasContext = canvas.getContext("2d");
                canvasContext.fillStyle = "#000000";
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                var maxPCM = 0;
                for (let i = 0; i < channelData.length; i++) {
                    if (Math.abs(channelData[i]) > maxPCM) {
                        maxPCM = Math.abs(channelData[i]);
                    }
                }
                console.log(maxPCM);
                console.log(channelData.length);

                const timeslice = 100;
                console.log(timeslice);

                for (let i = 0; i < canvas.width; i++) {
                    const x = i;
                    var ylow = 0;
                    var yhigh = 0;
                    for (let j = 0; j < timeslice; j++) {
                        const y = (channelData[Math.round(i * timeslice + j)] / maxPCM) * (canvas.height / 2);
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
                // const peaks = getPeaks([buffer.getChannelData(0), buffer.getChannelData(1)]);
                // console.log(peaks);
                // return peaks;
            };
        });
        console.log("done");
    };
    reader.readAsArrayBuffer(musicFile);
}