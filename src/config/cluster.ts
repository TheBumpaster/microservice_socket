import Logger from '../services/logger';
import { ClusterSettings, Worker } from "cluster" ;
import { createServer, Server as HttpServer } from 'http';
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import {cpus} from "os";
import { Server, Socket } from 'socket.io';

import cluster from 'cluster';
type StickyWorker = Worker & { clientsCount: number };

export const _setupMain = (httpServer: HttpServer, opts?: Record<string, string>) => {
  if (!cluster.isMaster) {
    Logger.warn("Not master, skipping");
    return;
  }

  const options = Object.assign(
    {
      loadBalancingMethod: "least-connection", // either "random", "round-robin" or "least-connection"
    },
    opts
  );

  const sessionIdToWorker = new Map();
  const sidRegex = RegExp(`/sid=([]{20})/`);
  let currentIndex = 0; // for round-robin load balancing

  const computeWorkerId = (data: string) => {
    const match = sidRegex.exec(data);
    if (match) {
      const sid = match[1];
      const workerId = sessionIdToWorker.get(sid);
      if (workerId && cluster.workers && cluster.workers[workerId]) {
        return workerId;
      }
    }

    let leastActiveWorker;

    switch (options.loadBalancingMethod) {
        case "random": {
            if (cluster.workers) {
                const workerIds = Object.keys(cluster.workers);
                return workerIds[Math.floor(Math.random() * workerIds.length)];
            }
        }
        break;

        case "round-robin": {
            if (cluster.workers) {
                const workerIds = Object.keys(cluster.workers);
                currentIndex++;

                if (currentIndex >= workerIds.length) {
                    currentIndex = 0;
                }

                return workerIds[currentIndex];
            }
        }
        break;

        case "least-connection":{
          for (const id in cluster.workers) {
            const worker = cluster.workers[id] as StickyWorker;

            if (worker) {
                if (leastActiveWorker === undefined) {

                    leastActiveWorker = worker;

                } else {

                    const c1 = worker.clientsCount || 0;
                    const c2 = leastActiveWorker.clientsCount || 0;

                    if (c1 < c2) {
                    leastActiveWorker = worker;
                    }

                }
            }

          }

          return leastActiveWorker?.id;
        }
    }

  };

  httpServer.on("connection", (socket) => {

    socket.once("data", (buffer) => {
      socket.pause();

      const data = buffer.toString();
      const workerId = computeWorkerId(data);

      if (cluster.workers) {

        const worker = cluster.workers[workerId] as StickyWorker;
        
        worker.send({ type: "sticky:connection", data }, socket, (err) => {
          if (err) {
            socket.destroy();
          }
        });

      }

    });
  });

  cluster.on("message", (worker: StickyWorker, { type, data }) => {

    switch (type) {
      case "sticky:connection":

        sessionIdToWorker.set(data, worker.id);

        if (options.loadBalancingMethod === "least-connection") {

          worker.clientsCount = (worker.clientsCount || 0) + 1;

        }
        break;

      case "sticky:disconnection":

        sessionIdToWorker.delete(data);

        if (options.loadBalancingMethod === "least-connection") {

          worker.clientsCount--;

        }
        break;
    }
  });
};

export const _setupChild = (io: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!cluster.isWorker) {
      Logger.warn("Not a child worker, skipping..");
      return;
    }

    process.on("message", ({ type, data }, socket: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        switch (type) {
            case "sticky:connection":
                if (!socket) {
                    // might happen if the socket is closed during the transfer to the worker
                    // see https://nodejs.org/api/child_process.html#child_process_example_sending_a_socket_object
                    return;
                }

                io.httpServer.emit("connection", socket); // inject connection

                // republish first chunk
                if (socket._handle.onread.length === 1) {

                    socket._handle.onread(Buffer.from(data));

                } else {
                    // for Node.js < 12
                    socket._handle.onread(1, Buffer.from(data));
                }

                socket.resume();

            break;
        }
    });


    io.engine.on("connection", (socket: Socket) => {
        if (process.send) {
            process.send({ type: "sticky:connection", data: socket.id }, () => {
              Logger.debug("Sticky connection established.");
            });

            socket.once("close", () => {
                if (process.send) {
                    process.send({ type: "sticky:disconnection", data: socket.id }, () => {
                      Logger.debug("Sticky connection closed.");
                    });
                }
            });
        }
    });

};

export const setupMain = (numCPUs = cpus().length) => {
    Logger.info(`Main ${process.pid} is starting.`);

    const mainHttpServer = createServer();

    // setup sticky sessions
    _setupMain(mainHttpServer, {
        loadBalancingMethod: "least-connection",
    });

    // setup connections between the workers
    setupPrimary();

    /**
     * needed for packets containing buffers ( ignore/skip this part if sending only plaintext objects)
     * Node.js < 16.0.0 => setupMaster({ serialization: "advanced" })
     * Node.js > 16.0.0 => setupPrimary({ serialization: "advanced" })
     */
    const settings = {
        serialization: "advanced",
    };
    if (process.version.includes('v16.')) {
        cluster.setupPrimary(settings as ClusterSettings);
    } else {
        cluster.setupMaster(settings as ClusterSettings);
    }

    mainHttpServer.listen(Number(process.env.PORT));

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        Logger.warn(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });

    return mainHttpServer;
}

export const setupChild = (io: Server) => {
    Logger.info(`Child process ${process.pid} is starting.`);

    const childHttpServer = createServer();

    io.listen(childHttpServer);
    io.adapter(createAdapter());
    _setupChild(io);

    return { io };
}