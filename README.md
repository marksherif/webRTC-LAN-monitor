# LAN Monitor 

This is a WebRTC powered LAN cctv solution

# Compiling and Running

First launch mongoDB and set it to listen on port 27017 (default) then

```sh
git clone git@github.com:marksherif/webRTC-LAN-monitor.git
cd webRTC-LAN-monitor
npm install
node bin/www
```

Now it is up and running, visit [https://localhost:3000/monitor](https://localhost:3000/monitor) to set up the camera and [https://localhost:3000/dashboard](https://localhost:3000/dashboard) to monitor and control all cameras.

### Features

* Renaming the monitors
* Remotely send an MP3 WAV or MPEG file and playing it directly in the browser
* Audio monitoring
* Opting into getting email notifications (via send grid) when sound levels reach high levels
