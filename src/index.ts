import cluster from "cluster";
import { Server } from "socket.io";
import { cpus } from "os";
import { setupChild, setupMain } from "./config/cluster";
import Logger from './services/logger';

import defaultNamespace from './namespace/index';
import notifications from "./namespace/notifications";

const numCPUs = Number(process.env.WORKER_NUM) || cpus().length;
Logger.debug(`Detected cluster with ${numCPUs} CPUs`);


if (!cluster.isWorker) {
    
    setupMain(numCPUs);

} else {

    const { io } = setupChild(
        new Server({
            path: "/socket.io",
            cors: {
                origin: "*:*"
            },
            allowEIO3: true,
            transports: ["websocket"],
            cookie: true,
        })
    );
    
    io.of(defaultNamespace.NAME)
    .on("connection", defaultNamespace.handler);

    io.of(notifications.NAME)
    .on("connection", notifications.handler);

}

