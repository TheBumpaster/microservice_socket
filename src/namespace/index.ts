import { Socket } from "socket.io";

const NAME = "/";
export enum Event {
    MESSAGE = "message"
}

function handleHello(this: Socket, args: unknown) {

    this.emit(Event.MESSAGE, args + " to you too.");

}


export default {
    NAME,
    handler: (client: Socket) => {

        client.emit(Event.MESSAGE, { message: `"Successfully connected to namespace '${NAME}' "`, clientId: client.id });

        client.on(Event.MESSAGE, handleHello);

    },

}