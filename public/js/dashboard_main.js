var connection = new WebSocket('wss://localhost:3000');
connection.onopen = function () {
    console.log("Connected");
};

var dataChannel,
    currentFile,
    currentFileSize,
    currentFileMeta,
    name,
    connectedUser,
    user_id;

error = document.querySelector('#taken_id_error')
success = document.querySelector('#rename_successful')

// Handle all messages through this callback
connection.onmessage = function (message) {
    var data = JSON.parse(message.data);
    if (data.type != "candidate") {
        console.log("Got message", message.data);
    }
    switch (data.type) {
        case "login":
            onLogin(data.success, data.id);
            break;
        case "offer":
            onOffer(data.offer, data.name);
            break;
        case "answer":
            onAnswer(data.answer);
            break;
        case "candidate":
            onCandidate(data.candidate);
            break;
        case "leave":
            onLeave();
            break;
        case "new_user":
            onUsers(data.users);
            break;
        case "id_taken":
            onTakenID(data.id);
            break;
        default:
            break;
    }
};
var online_users = [];
var sel = document.getElementById('dashboard-users');
function onUsers(users) {
    users = users.filter(function (x) { return x !== user_id; })
    sel.options.length = 0;
    online_users = [];
    users.forEach(function (user) {
        // list += `<li>` + user + ` <input type="button" value="Call" onclick="callUser('` + user + `')" id="makeCall" /></li>`
        var opt = document.createElement('option');
        opt.appendChild(document.createTextNode(user));
        opt.value = user;
        sel.appendChild(opt);
        online_users.push(user)
    })

}

connection.onerror = function (err) {
    console.log("Got error", err);
};

// Alias for sending messages in JSON format
function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }
    connection.send(JSON.stringify(message));
};



var currentFile = [],
    currentFileMeta;


function onLogin(success, id) {
    if (success === false) {
        alert("Login unsuccessful, please try a different name.");
    } else {
        user_id = id
        startConnection();
    }
};

function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription ||
        window.webkitRTCSessionDescription ||
        window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate ||
        window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}

callButton = document.querySelector('#call')
hangUpButton = document.querySelector('#hang')
renameButton = document.querySelector('#rename')
sendFileButton = document.querySelector('#send_file');
hangUpButton.disabled = true;
sendFileButton.disabled = true;

renameButton.addEventListener("click", function () {
    new_name = document.querySelector('#new-name')

    if (online_users.includes(new_name.value)) {
        error.style.display = "";
        success.style.display = "none";
    }
    else {
        error.style.display = "none";
        send({
            type: "rename",
            monitor_old: sel.options[sel.selectedIndex].value,
            monitor_new: new_name.value,
            admin_id: user_id
        });
        success.style.display = "";
    }
});

function onTakenID(id) {
}

function startConnection() {
    if (hasRTCPeerConnection()) {
        setupPeerConnection();
    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}

theirVideo = document.querySelector('#theirs')
function setupPeerConnection(stream) {
    yourConnection = new RTCPeerConnection();
    openDataChannel();
    yourConnection.ondatachannel = function (ev) {
        console.log(ev);

        ev.onerror = function (error) {
            console.log("Data Channel Error:", error);
        };
        ev.channel.onmessage = function (event) {
            try {
                var message = JSON.parse(event.data);
                switch (message.type) {
                    case "start": currentFile = [];
                        currentFileMeta = message.data;
                        console.log("Receiving file", currentFileMeta);
                        break;
                    case "end": console.log("file sent!");
                        console.log(currentFile);
                        initSound(currentFile);
                        break;
                }
            } catch (e) {
                // Assume this is file content
                currentFile.push(event.data);
            }
        };
        ev.channel.onopen = function () {
            console.log('datachannel is now open');
        };
        ev.onclose = function () {
            console.log("The Data Channel is Closed");
        };
    };

    yourConnection.ontrack = function (e) {
        theirVideo.srcObject = e.streams[0];
        soundLevel(e.streams[0])
        hangUpButton.disabled = false;
        callButton.disabled = true;
        rename.disabled = true;
        sendFileButton.disabled = false;
    }

    yourConnection.onicecandidate = function (event) {
        console.log(event);

        if (event.candidate) {
            send({
                type: "candidate",
                candidate: event.candidate
            });
        }
    };
}


callButton.addEventListener("click", function () {
    callUser(sel.options[sel.selectedIndex].value);
});

function callUser(user) {
    if (user.length > 0) {
        if (yourConnection.signalingState == 'closed')
            setupPeerConnection();
        startPeerConnection(user);
    }
}

function startPeerConnection(user) {
    connectedUser = user;

    var mediaConstraints = {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': true
    };

    var currentoffer;
    yourConnection.createOffer(mediaConstraints).then(offer => {
        currentoffer = offer
        yourConnection.setLocalDescription(offer);
    })
        .then(function () {
            send({
                type: "offer",
                offer: currentoffer
            });
        })
        .catch(function (reason) {
            alert("Problem with creating offer. " + reason);
        });
};

function onOffer(offer, name) {
    connectedUser = name;
    // console.log(offer)
    yourConnection.setRemoteDescription(new
        RTCSessionDescription(offer));


    var currentanswer;
    yourConnection.createAnswer().then(answer => {
        currentanswer = answer;
        yourConnection.setLocalDescription(answer);
    })
        .then(function () {
            send({
                type: "answer",
                answer: currentanswer
            });
        })
        .catch(function (reason) {
            alert("Problem with creating answer. " + reason);
        });
};

function onAnswer(answer) {
    yourConnection.setRemoteDescription(new
        RTCSessionDescription(answer));
};

function onCandidate(candidate) {
    // if (yourConnection.signalingState == "stable") return;
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};


hangUpButton.addEventListener("click", function () {
    send({
        type: "leave"
    });
    onLeave();
});

function onLeave() {
    if (connectedUser)
        connectedUser = null;
    if (theirVideo.srcObject)
        theirVideo.srcObject = null;
    if (dataChannel)
        dataChannel.close();
    if (yourConnection)
        yourConnection.close();
    if (yourConnection.onicecandidate)
        yourConnection.onicecandidate = null;
    if (yourConnection.ontrack)
        yourConnection.ontrack = null;
    hangUpButton.disabled = true;
    callButton.disabled = false;
    rename.disabled = false;
    sendFileButton.disabled = true;
    soundMeter.stop()
    var interval_id = window.setInterval("", 9999);
    for (var i = 1; i < interval_id; i++)
        window.clearInterval(i);
};

function openDataChannel() {
    // var dataChannelOptions = {
    //     reliable: true
    // };
    dataChannel = yourConnection.createDataChannel("lullaby");

    dataChannel.onerror = function (error) {
        console.log("Data Channel Error:", error);
    };
    dataChannel.onmessage = function (event) {
        try {
            var message = JSON.parse(event.data);
            switch (message.type) {
                case "start": currentFile = [];
                    currentFileMeta = message.data;
                    console.log("Receiving file", currentFileMeta);
                    break;
                case "end":
                    console.log(currentFile);
                    initSound(currentFile);
                    // case "end": saveFile(currentFileMeta, currentFile);
                    break;
            }
        } catch (e) {
            // Assume this is file content
            currentFile.push(atob(event.data));
        }
    };
    dataChannel.onopen = function () {
        console.log('datachannel is now open');
        // dataChannel.send(user_id + " has connected.");
    };
    dataChannel.onclose = function () {
        console.log("The Data Channel is Closed");
    };

}


sendFileButton.addEventListener("click", function (event) {
    var files = document.querySelector('#files').files;
    console.log(files[0]);
    if (files.length > 0) {
        dataChannel.send(JSON.stringify({
            type: "start",
            data: files[0]
        }));

        sendFile(files[0]);
    }
});

var progress = document.querySelector('#download-progress');


var CHUNK_MAX = 16000;
function sendFile(file) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) {
            var buffer = reader.result, start = 0, end = 0, last = false;
            console.log("file size =" + buffer.length);
            function sendChunk() {
                end = start + CHUNK_MAX;
                var percentage = Math.floor((end / buffer.length) * 100);
                progress.value = percentage;
                if (end > buffer.length) {
                    end = buffer.length;
                    console.log(end);
                    last = true;
                } dataChannel.send(buffer.slice(start, end));
                // If this is the last chunk send our end message, otherwise keep sending
                if (last === true) {
                    dataChannel.send(JSON.stringify({
                        type: "end"
                    }));
                } else {
                    start = end;
                    // Throttle the sending to avoid flooding
                    setTimeout(function () {
                        sendChunk();
                    }, 100);
                }

            } sendChunk();
        }
    };
}

//play audio
function initSound(audioBase64) {
    var one_line_string = audioBase64.join().replace(/,/g, '');
    output = [one_line_string.slice(0, 21), ',', one_line_string.slice(21)].join('');
    console.log(output);

    try {
        var audio = new Audio(output);
    }
    catch (e) {
        console.log(e);

    }
    console.log(output);

    audio.controls = true;
    document.body.appendChild(audio);
    audio.play();
}

//Quiet mode
var email_sent = false;

var instantMeter = document.getElementById('sound_monitor');

var instantValueDisplay = document.getElementById('sound_value');

try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
} catch (e) {
    alert('Web Audio API not supported.');
}

var soundMeter;
var interval;
function soundLevel(stream) {
    // Put variables in global scope to make them available to the
    // browser console.
    window.stream = stream;
    soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
    soundMeter.connectToSource(stream, function (e) {
        if (e) {
            alert(e);
            return;
        }
        interval = setInterval(() => {
            instantMeter.value = instantValueDisplay.innerText =
                soundMeter.instant.toFixed(2);
        }, 100);
    });
}

function SoundMeter(context) {
    this.context = context;
    this.instant = 0.0;
    this.script = context.createScriptProcessor(2048, 1, 1);
    const that = this;
    this.script.onaudioprocess = function (event) {
        const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
        }
        that.instant = Math.sqrt(sum / input.length);
        if (that.instant > 0.4 && !email_sent && document.getElementById('quiet_mode').checked) {
            console.log("Loud noises");
            email_sent = true;
            sendEmail();
        }
    };
}

var mic;

SoundMeter.prototype.connectToSource = function (stream, callback) {
    console.log('SoundMeter connecting');
    try {
        mic = this.context.createMediaStreamSource(stream);
        mic.connect(this.script);
        // necessary to make sample run, but should not be.
        this.script.connect(this.context.destination);
        if (typeof callback !== 'undefined') {
            callback(null);
        }
    } catch (e) {
        console.error(e);
        if (typeof callback !== 'undefined') {
            callback(e);
        }
    }
};

SoundMeter.prototype.stop = function () {
    mic.disconnect();
    this.script.disconnect();
    instantMeter.value = instantValueDisplay.innerText = 0.00;
};

function sendEmail() {
    send({
        type: "notify"
    });
}