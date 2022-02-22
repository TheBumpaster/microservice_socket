import { Socket } from "socket.io";
import os from 'os';
import Logger from '../../services/logger';

const NAME = "/notifications";

export enum Event {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error"
}

export enum ActionType {
    USER = "user",
    CPU = "cpu"
}

function handleInfo(this: Socket, { type, sendToEvent }: Record<string, string>) {

    // Send the message to appropriate API

    switch (type) {
        case ActionType.USER:
            this.emit(sendToEvent, os.userInfo( { encoding: "utf-8" } ))
        break;

        case ActionType.CPU:
            this.emit(sendToEvent, os.cpus())
        break;

        default:
            this.emit(sendToEvent, { message: "pass 'type': \"user\" or \"cpu\" to payload" });
    }

}

function handleWarning(this: Socket, payload: Record<string, string>) {
    //
    Logger.warn(payload)
}

function handleError(this: Socket, payload: Record<string, string>) {
    //
    Logger.error(payload);
}


export default {
    NAME,
    handler: (client: Socket) => {

        client.emit(Event.INFO, { message: `"Successfully connected to namespace '${NAME}' "`, clientId: client.id });

        client.on(Event.INFO, handleInfo);
        client.on(Event.WARNING, handleWarning);
        client.on(Event.ERROR, handleError);

    },

}