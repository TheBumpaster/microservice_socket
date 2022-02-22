# Microservice Boilerplate

## Production

Update .env files or mount different path

```bash

## Build the image
docker build --build-arg NODE=production . -t microservice_a

## Run and pass env
docker run --env-file ./.env -p 3000:3000 --name microservice_a_container microservice_a

```

## Development & Testing

```bash

# Build with compose as production environment
npm run docker:build
npm run docker:rebuild # to recreate on changes

# Build the image and associate volume paths and watch file changes
npm run docker:dev:build
npm run docker:dev:rebuild # in case production build is already running

# Run Artillery Script
npm run test

```

## Socket Namespaces

ws://localhost:3000/
ws://localhost:3000/notifications

Example client code:

```javascript
// JavaScript socket.io code

import io from "socket.io-client";

//Connection
const socket = io( "ws://localhost:3002/notifications", {
  "path": "/socket.io",
  "transports": ["0"],
  "transportOptions": {
    "polling": {
        "extraHeaders": {}
    }
  }
  "rejectUnauthorized" : false,
  "timeout" : 20000,
  "reconnection" : false,
  "reconnectionAttempts" : 3,
  "reconnectionDelay" : 1000,
  "reconnectionDelayMax" : 5000
});

// Listeners

socket.on("connect", (data) => {
  console.log("socket connected");
});

socket.on("disconnect", () => {
  console.log("socket disconnected");
});

socket.on("cpuResults", (result) => {
    console.log(result);
});

socket.on("userResults", (result) => {
    console.log(result);
});

// Emitters

socket.emit("info", { type: "cpu", sendToEvent: "cpuResults" });
socket.emit("info", { type: "user", sendToEvent: "userResults" });

// for more information: https://github.com/socketio/socket.io-client/blob/master/docs/API.md



