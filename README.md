# Over LAN Baby Monitor 

This is a WebRTC powered baby monitoring solution that is functional over LAN networks

# Compiling and Running

First launch mongoDB and set it to listen on port 27017 (default) then

```sh
git clone git@github.com:marksherif/webRTC-baby-monitor.git
cd webRTC-baby-monitor
npm install
node bin/www
```

Now it is up and running, visit [https://localhost:3000/monitor](https://localhost:3000/monitor) to set up the baby monitor and [https://localhost:3000/dashboard](https://localhost:3000/dashboard) to monitor and control the baby monitors.

### Features

* Renaming the monitors
* Remotely send an MP3 WAV or MPEG file and playing it directly in the browser
* Audio monitoring
* Opting into getting email notifications (via send grid) when sound levels reach high levels
