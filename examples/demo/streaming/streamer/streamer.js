var SESSION_STATUS = Flashphoner.constants.SESSION_STATUS;
var STREAM_STATUS = Flashphoner.constants.STREAM_STATUS;
var PRELOADER_URL = "../../dependencies/media/preloader.mp4";
var localVideoRender;
var remoteVideoRender;


//////////////////////////////////
/////////////// Init /////////////

function init_page() {
    //init api
    try {
        Flashphoner.init({flashMediaProviderSwfLocation: '../../../../media-provider.swf'});
    } catch(e) {
        $("#notifyFlash").text("Your browser doesn't support Flash or WebRTC technology needed for this example");
        return;
    }

    //local and remote displays
    localVideoRender = document.getElementById("localVideo");
    remoteVideoRender = document.getElementById("remoteVideo");

    let prefixURL="wss://192.168.1.169:8443";

    $("#url").val(prefixURL + "/" + createUUID(8));
    //set initial button callback
    onStopped();

}

function onStarted(publishStream, previewStream) {
    console.log("OnStred..........")
    $("#publishBtn").text("Stop").off('click').click(function(){
        $(this).prop('disabled', true);
        previewStream.stop();
    }).prop('disabled', false);
}

function onStopped() {
    $("#publishBtn").text("Start").off('click').click(publishBtnClick).prop('disabled', false);
}

function publishBtnClick() {
    $(this).prop('disabled', true);
    if (Browser.isSafariWebRTC()) {
        Flashphoner.playFirstVideo(localVideoRender, true, PRELOADER_URL).then(function() {
            Flashphoner.playFirstVideo(remoteVideoRender, false, PRELOADER_URL).then(function() {
                start();
            });
        });
        return;
    }
    start();
}

function start() {
    startVideo();
    //check if we already have session
    if (Flashphoner.getSessions().length > 0) {
        startStreaming(Flashphoner.getSessions()[0]);
    } else {
        //create session
        var url = field('url');
        console.log("Create new session with url " + url);
        $('#url').prop('disabled', true);
        Flashphoner.createSession({urlServer: url}).on(SESSION_STATUS.ESTABLISHED, function(session){
            //session connected, start streaming
            startStreaming(session);
        }).on(SESSION_STATUS.DISCONNECTED, function(){
            setStatus(SESSION_STATUS.DISCONNECTED);
            $('#url').prop('disabled', false);
            onStopped();
        }).on(SESSION_STATUS.FAILED, function(){
            setStatus(SESSION_STATUS.FAILED);
            $('#url').prop('disabled', false);
            onStopped();
        });
    }
}

function startStreaming(session) {
    var streamName = field("url").split('/')[3];

    var constraints = {
        audio: false,
        video: false,
        customStream: canvas.captureStream()
    };

    session.createStream({
        name: streamName,
        display: localVideoRender,
        constraints: constraints,
        cacheLocalResources: true,
        receiveVideo: false,
        receiveAudio: false
    }).on(STREAM_STATUS.PUBLISHING, function(publishStream){
        setStatus(STREAM_STATUS.PUBLISHING);
        //play preview
        console.log("CP ",publishStream)
        session.createStream({
            name: streamName,
            display: remoteVideoRender
        }).on(STREAM_STATUS.PLAYING, function(previewStream){
            //enable stop button
            onStarted(publishStream, previewStream);
        }).on(STREAM_STATUS.STOPPED, function(){
            console.log("Stopped..........................")
            publishStream.stop();
        }).on(STREAM_STATUS.FAILED, function(stream){
            console.log("Filed..........................")
            //preview failed, stop publishStream
            if (publishStream.status() == STREAM_STATUS.PUBLISHING) {
                setStatus(STREAM_STATUS.FAILED, stream);
                publishStream.stop();
            }
        }).play();
    }).on(STREAM_STATUS.UNPUBLISHED, function(){
        setStatus(STREAM_STATUS.UNPUBLISHED);
        //enable start button
        onStopped();
    }).on(STREAM_STATUS.FAILED, function(stream){
        setStatus(STREAM_STATUS.FAILED, stream);
        //enable start button
        onStopped();
    }).publish();
}

//show connection or local stream status
function setStatus(status, stream) {
    var statusField = $("#status");
    var infoField = $("#info");
    statusField.text(status).removeClass();
    if (status == "PUBLISHING") {
        statusField.attr("class","text-success");
        infoField.text("");
    } else if (status == "DISCONNECTED" || status == "UNPUBLISHED") {
        statusField.attr("class","text-muted");
    } else if (status == "FAILED") {
        statusField.attr("class","text-danger");
        if (stream) {
            infoField.text(stream.getInfo()).attr("class","text-muted");
        }
    }
}
