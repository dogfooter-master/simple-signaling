let username = 'admin';
let connectedUser = '';
let opponent_client_token = '';
let loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up');
let yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector('#theirs'),
    yourConnection, stream;
let connection = new WebSocket('wss://dermaster.io/ws');
let configuration = {
    //'iceServers' : [{ 'url' : 'stun:stun.l.google.com:19302'}]
    //'iceServers' : [{ 'url' : 'stun:1.234.23.6:3478'}]
    'iceServers': []
};
const videoSelect = document.querySelector('#video-source');
const audioInputSelect = document.querySelector('#audio-source');
const selectors = [audioInputSelect, videoSelect];

callPage.style.display = 'none';

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    const values = selectors.map(select => select.value);
    selectors.forEach(select => {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
//        } else if (deviceInfo.kind === 'audiooutput') {
//            option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
//            audioOutputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        } else {
            console.log('Some other kind of source/device: ', deviceInfo);
        }
    }
    selectors.forEach((select, selectorIndex) => {
        if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
        }
    });
}


function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

loginButton.addEventListener('click', function (e) {
    username = usernameInput.value;
    if (username.length > 0) {
        send({
            data: {
                category: "ws",
                service: "SignIn",
                account: "wonsuck_song@lazybird.kr",
                password: "Hotice1234!",
            }
        });
    }
});

connection.onopen = function () {
    console.log('Connected');
};
connection.onmessage = function (message) {
    console.log('Got message', message.data);
    var data = JSON.parse(message.data);
    switch (data.data.service) {
        case 'SignIn':
            onLogin(true);
            break;
        case 'RequestOffer':
            opponent_client_token = data.data.opponent_client_token;
            startPeerConnection();
            break;
        case "Offer":
            opponent_client_token = data.data.opponent_client_token;
            onOffer(data.data.sdp, opponent_client_token);
            break;
        case "Answer":
            onAnswer(data.data.sdp);
            break;
        case "Candidate":
            onCandidate(data.data.candidate.candidate);
            break;
        case "leave":
            onLeave();
            break;
        default:
            break;
    }
}
connection.onerror = function (e) {
    console.log('Got error', err);
}

function send(message) {
    // if (connectedUser) {
    //     message.username = connectedUser;
    // }
    if (connection.readyState === 1) {
        console.log(JSON.stringify(message));
        connection.send(JSON.stringify(message));
    } else {
        connection = new WebSocket('wss://dermaster.io/ws');
    }
}

function onLogin(success) {
    console.log('DEBUG---1');
    if (success === false) {
        console.log('DEBUG---2');
        alert('Login unsuccessful, please try a different name.');
    } else {
        loginPage.style.display = 'none';
        callPage.style.display = 'block';
        startConnection();
    }
}

callButton.addEventListener('click', function() {
    send({
        data: {
            category: "ws",
            service: "StartToLive",
            access_token: "0989cc0bcd5111e9ae8d02420a0004df",
        }
    });
    // startPeerConnection('');
});

hangUpButton.addEventListener("click", function () {
    send({
        type: "leave"
    });
    onLeave();
});

function onOffer(offer, name) {
    connectedUser = name;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));
    yourConnection.createAnswer(function (answer) {
        yourConnection.setLocalDescription(answer);
        send({
            data: {
                category: "ws",
                service: "Answer",
                sdp: answer,
                opponent_client_token: name,
                access_token: "0989cc0bcd5111e9ae8d02420a0004df",
            }
        });
    }, function (error) {
        alert("An error has occurred");
    });
}
function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function onCandidate(candidate) {
    console.log('DEBUGXXXX', candidate);
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function onLeave() {
    connectedUser = null;
    theirVideo.src = null;
    yourConnection.close();
    yourConnection.onicecandidate = null;
    yourConnection.onaddstream = null;
    setupPeerConnection(stream);
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

function startConnection() {
    var ua = navigator.userAgent.toLowerCase(); 
    if (ua.indexOf('safari') != -1) {
        console.log('DEBUG1');
        if (ua.indexOf('chrome') <= -1) {
            console.log('DEBUG2');
            navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            }).then(function(myStream) {
                    stream = myStream;
                    yourVideo.srcObject = myStream;
                    setupPeerConnection(stream);
            }).catch(function (err) {
                console.log(err);
            });
        } else {
            let enableVideo;
            let enableAudio;
            let videoSource = videoSelect.value;
            let audioSource = audioInputSelect.value;

            if (true) {
                console.log('DEBUG3');
                enableVideo = false;
                enableAudio = false;
                yourVideo.style.display = 'none';
                setupPeerConnection2();
            } else {
                navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
                enableVideo = {
                    deviceId: videoSource ? { exact: videoSource } : undefined
                }
                enableAudio= {deviceId: audioSource ? {exact: audioSource} : undefined}


                navigator.mediaDevices.getUserMedia({
                    video: enableVideo,
                    audio: enableAudio,
                }).then(function(myStream) {
                    stream = myStream;
                    yourVideo.srcObject = myStream;
                    setupPeerConnection(stream);
                }).catch(function (err) {
                    setupPeerConnection2();
                    console.log(err);
                });
            }
            //console.log('enableVideo', enableVideo);
        }
    }
}

videoSelect.onchange = startConnection;
audioInputSelect.onchange = startConnection;

function setupPeerConnection(stream) {
    yourConnection = new RTCPeerConnection(configuration);

    yourConnection.addStream(stream);
    yourConnection.onaddstream = function(e) {
        theirVideo.srcObject = e.stream;
    };

    yourConnection.onicecandidate = function(e) {
        if (e.candidate) {
            send({
                type: "candidate",
                candidate: e.candidate,
            });
        }
    };
}

function setupPeerConnection2() {
    yourConnection = new RTCPeerConnection(configuration);

    yourConnection.onaddstream = function(e) {
    	console.log('DEBUGXXXX:', e.stream)
        theirVideo.srcObject = e.stream;
    };

    yourConnection.onicecandidate = function(e) {
        if (e.candidate) {
            console.log('candidate', e.candidate);
            send({
                data: {
                    category: "ws",
                    service: "Candidate",
                    candidate: {
                        candidate: e.candidate,
                    },
                    access_token: "0989cc0bcd5111e9ae8d02420a0004df",
                    opponent_client_token: opponent_client_token,
                }
            });
        }
    };

    send({
        data: {
            category: 'ws',
            service: 'RegisterMate',
            client_type: "mate",
            access_token: "0989cc0bcd5111e9ae8d02420a0004df",
        }
    })
}

function startPeerConnection(user) {
    connectedUser = user;
    // Begin the offer
    yourConnection.createOffer({
        offerToReceiveAudio: true, offerToReceiveVideo: true 
    }).then(function (offer) {
        send({
            data: {
                category: "ws",
                service: "Offer",
                access_token: "0989cc0bcd5111e9ae8d02420a0004df",
                opponent_client_token: opponent_client_token,
                sdp: offer,
            }
        });
        yourConnection.setLocalDescription(offer);
    }).catch(function (error) {
        alert("An error has occurred.");
    });
};
