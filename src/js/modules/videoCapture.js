export default function videoCapture (video) {
  video = document.getElementById("video");
  navigator.mediaDevices.getUserMedia({
    video: true,
    video: { facingMode: "environment" },
    audio: false
  }).then((stream) => { video.srcObject = stream; });
}
