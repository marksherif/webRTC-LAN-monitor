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

var img = document.getElementById('live');
img.style.visibility = 'hidden';

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
        default:
            break;
    }
};


function onUsers(users) {

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
        console.log("user ID", user_id);
        var header = document.getElementById("user_id_welcome");
        header.innerHTML = "Monitor ID: " + user_id

        // Get the plumbing ready for a call
        startConnection();
    }
};

var yourVideo = document.querySelector('#yours'),
    yourConnection, connectedUser, stream;

var globalStream;

function startConnection() {
    if (hasUserMedia()) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                globalStream = stream
                console.log(stream)
                yourVideo.srcObject = stream;
                console.log(stream);
                if (hasRTCPeerConnection()) {
                    setupPeerConnection(stream);
                } else {
                    alert("Sorry, your browser does not support WebRTC.");
                }
            })
            .catch(error => console.log(error));
    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}

function setupPeerConnection(incomingStream) {
    stream = incomingStream
    yourConnection = new RTCPeerConnection();
    openDataChannel();
    yourConnection.ondatachannel = function (ev) {
        console.log(ev);

        // console.log('Data channel is created!');
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
                        // case "end": saveFile(currentFileMeta, currentFile);
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

    for (const track of stream.getTracks()) {
        yourConnection.addTrack(track, stream);
    }
    yourConnection.ontrack = e => theirVideo.srcObject = e.streams[0];


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

function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
    return !!navigator.getUserMedia;
}

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


function callUser(user) {
    if (user.length > 0) {
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
    if (yourConnection.signalingState == 'closed') {
        setupPeerConnection(globalStream)
    }
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
            img.style.visibility = 'visible';
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
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};


function openDataChannel() {
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
                    break;
            }
        } catch (e) {
            // Assume this is file content
            currentFile.push(atob(event.data));
        }
    };
    dataChannel.onopen = function () {
        console.log('datachannel is now open');
    };
    dataChannel.onclose = function () {
        console.log("The Data Channel is Closed");
    };

}

function onLeave() {
    img.style.visibility = 'hidden';
    if (connectedUser)
        connectedUser = null;
    if (dataChannel)
        dataChannel.close();
    if (yourConnection)
        yourConnection.close();
    if (yourConnection.onicecandidate)
        yourConnection.onicecandidate = null;
};

function hasFileApi() { return window.File && window.FileReader && window.FileList && window.Blob; }

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
                received.innerHTML = "Sending... " + percentage + "%";
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
    }; reader.readAsArrayBuffer(file);
}

var sound = document.createElement('audio');
//play audio
function initSound(audioBase64) {
    var one_line_string = audioBase64.join().replace(/,/g, '');
    if (one_line_string.slice(0, 15).includes("wav") || (one_line_string.slice(0, 15).includes("mp3")))
        output = [one_line_string.slice(0, 21), ',', one_line_string.slice(21)].join('');
    else if (one_line_string.slice(0, 15).includes("mpeg"))
        output = [one_line_string.slice(0, 22), ',', one_line_string.slice(22)].join('');
    try {
        var audio = new Audio(output);
    }
    catch (e) {
        console.log(e);

    }
    console.log(output);

    sound.id = 'audio-player';
    sound.controls = 'controls';
    sound.src = output;
    document.getElementById('song').appendChild(sound);
    document.getElementById('audio-player').play();
}
