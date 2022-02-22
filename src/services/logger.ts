import { createLogger, format } from "winston";
import Transport, { TransportStreamOptions } from 'winston-transport';
import { SERVER_NAME } from "../config/constants";

type FormatData = {
    level: string,
    message: string,
    metadata: Record<string, unknown>,
    timestamp: string,
    label: string
};

class CustomTransport extends Transport {
    constructor(opts?: TransportStreamOptions) {
        super(opts);
    }

    log(info: FormatData, callback: () => void ) {
        setImmediate(() => {
            process.stdout.write(this.customFormat(info));
            process.stdout.write("\n");
        });

        callback()
    }

    customFormat( { level, message, metadata, label, timestamp }: FormatData ) {
        const date = new Date(timestamp);
        let meta = '| ';
        if (Object.keys(metadata).length > 0) {
            meta += JSON.stringify(metadata);
        }

        return `{${label}} [${level.toUpperCase()}] ${date.toLocaleDateString()} ${date.toLocaleTimeString()} : ${message} ${meta}`;
    }
}

let level = 'info';

if (process.env.NODE_ENV === "development") {
    level = 'debug'
}

if (process.env.NODE_ENV === "production") {
    level = 'error'
}

const Logger = createLogger({
    level,
    format: format.combine(
        format.metadata(),
        format.label({ label: SERVER_NAME }),
        format.timestamp(),
    ),
    transports: [
        new CustomTransport()
    ]
});


export default Logger;