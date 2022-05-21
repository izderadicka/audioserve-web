import { baseWsUrl } from "../util/browser";

interface LastPosition {
    position: number,
    timestamp: Date,
}

interface PendingPosition extends LastPosition{
    filePath: string
}

export interface PlaybackSyncConfig {
    development?: boolean;
    developmentPort: number;
    positionReportingPeriod: number;
    group?: string;

}

export class PlaybackSync {
    socketUrl: string;
    closed: boolean;
    filePath: string;
    failures: number;
    socket: WebSocket;
    lastSend: LastPosition;
    pendingPosition: PendingPosition;
    pendingPositionTimeout: number;
    pendingQuery: string;
    pendingQueryTimeout: number;
    pendingQueryAnswer: (any) => void;
    pendingQueryReject: (Error) => void;
    pendingOpen: number = null;

    config: PlaybackSyncConfig;

    private _groupPrefix: string;
    private _enabled: boolean;

    constructor(config: PlaybackSyncConfig) {

        this.socketUrl = baseWsUrl(config.development, config.developmentPort) + "/position";
        this.closed = false;
        this.filePath = null;
        this._groupPrefix = null;
        this.failures = 0;
        this._enabled = true;
        this._groupPrefix = config.group;
        this.config = config;
    }

    get groupPrefix() {
        return this._enabled ? this._groupPrefix : null;
    }

    set groupPrefix(v) {
        this._groupPrefix = v;
    }

    disable() {
        this._enabled = false;
    }

    try_open() {
        if (this.pendingOpen != null || this.opening) return;
        this.pendingOpen = window.setTimeout(()=> {
            this.open();
            this.pendingOpen = null;

        },
        Math.min(10_000, this.failures<3?0: (this.failures-2) * 500)) // throttle retries progressively
    }

    open() {
        this.closed = false;
        console.debug("Opening ws on url " + this.socketUrl);
        const webSocket = new WebSocket(this.socketUrl);
        webSocket.addEventListener("error", err => {
            console.error(`Web socket error (in row ${this.failures})`, err);
            this.failures += 1;
        });
        webSocket.addEventListener("close", close => {
            this.socket = null;
            console.debug("Web socket close", close);
            // Do not reopen - it'll reopen only on demand
            // if (! this.closed && this.failures < 20) window.setTimeout(() => this.open(), 100 * Math.min(5, this.failures));

        });
        webSocket.addEventListener("open", ev => {
            this.failures = 0;
            this.filePath = null;
            this.lastSend = null;
            console.debug("Web socket is ready");
            // do we have pending time update?
            if (this.pendingPosition) {
                if ((new Date().getTime() - this.pendingPosition.timestamp.getTime()) < 300000000) { // do not send old updates
                    this.enqueuePosition(this.pendingPosition.filePath, this.pendingPosition.position, this.pendingPosition.timestamp);
                }
                this.pendingPosition = null;
            }
            // do we have pending query?
            if (this.pendingQuery) {
                this.socket.send(this.pendingQuery);
                this.pendingQuery = null;
            }
        });
        webSocket.addEventListener("message", evt => {
            console.debug("Got message " + evt.data);
            const data = JSON.parse(evt.data);
            const parseGroup = (item) => {
                if (item && item.folder) {
                    const [prefix, collection] = /^(\d+)\//.exec(item.folder);
                    item.folder = item.folder.substr(prefix.length);
                    item.collection = parseInt(collection);
                }
            };
            parseGroup(data.folder);
            parseGroup(data.last);
            if (this.pendingQueryAnswer) {
                if (this.pendingQueryTimeout) clearInterval(this.pendingQueryTimeout);
                this.pendingQueryTimeout = null;
                this.pendingQueryAnswer(data);
                this.pendingQueryAnswer = null;
                this.pendingQueryReject = null;
            }
        });

        this.socket = webSocket;
    }

    close() {
        this.closed = true;
        this.socket.close();
        this.socket = null;;
    }

    enqueuePosition(filePath: string, position:number, timestamp: Date  = null) {
        if (this.pendingPositionTimeout) {
            window.clearTimeout(this.pendingPositionTimeout);
            this.pendingPositionTimeout = null;
        }
        if (!this.groupPrefix) return;
        if (!this.active) {
            this.pendingPosition = {
                filePath,
                position,
                timestamp: new Date()
            };

            this.try_open();
            return;
        };
        filePath = this.groupPrefix + filePath;
        if (this.filePath && this.lastSend && filePath == this.filePath) {
            const lastSendTime = (Date.now() - this.lastSend!.timestamp.getTime())/1000;
            const lastSendPosition = Math.abs(position - this.lastSend.position);
            if ( lastSendTime >= this.config.positionReportingPeriod ||
                lastSendPosition > this.config.positionReportingPeriod) {
                this.sendMessage(position);
            } else {
                this.pendingPositionTimeout = window.setTimeout(() => {
                    this.sendMessage(position);
                    this.pendingPositionTimeout = null;
                },
                    this.config.positionReportingPeriod * 1000
                );
            }
        } else {
            this.filePath = filePath;
            this.sendMessage(position, filePath, timestamp);
        }
    }

    private sendMessage(position: number, filePath?: string, timestamp?: Date) {
        if (this.active) {
            position = Math.round(position * 10) / 10;
            let msg = position.toString() + "|";
            if (filePath) msg += filePath;
            if (timestamp) msg += '|' + Math.round(timestamp.getTime()/1000);
            this.socket.send(msg);
            this.lastSend = {
                position,
                timestamp: new Date()
            };
        } else {
            console.error("Cannot send message, socket not ready");
        }

    }

    queryPosition(folderPath) {
        if (this.pendingQueryReject) {
            if (this.pendingQueryTimeout) {
                clearTimeout(this.pendingQueryTimeout);
                this.pendingQueryTimeout = null;
            }

            this.pendingQueryReject(new Error("Canceled by next query"));
            this.pendingQueryAnswer = null;
            this.pendingQueryReject = null;

        }

        if (this.groupPrefix && this.active) {
            const p = this._makeQueryPromise();
            this.socket.send(folderPath ? this.groupPrefix + folderPath : "?");
            return p;

        } else if (this.groupPrefix && !this.active) {
            this.pendingQuery = folderPath ? this.groupPrefix + folderPath : "?";
            this.try_open()
            return this._makeQueryPromise();
        } else {
            return Promise.resolve(null);
        }

    }

    private _makeQueryPromise() {
        return new Promise((resolve, reject) => {
            this.pendingQueryAnswer = resolve;
            this.pendingQueryReject = reject;
            this.pendingQueryTimeout = window.setTimeout(() => {
                reject(new Error("Timeout"));
                this.pendingQueryTimeout = null;
                this.pendingQueryReject = null;
                this.pendingQueryAnswer = null;
                this.pendingQuery = null;
            }, 3000);
        });
    };

    get active() {
        return !this.closed && this.socket && this.socket.readyState == WebSocket.OPEN;
    }

    get opening() {
        return this.socket && this.socket.readyState == WebSocket.CONNECTING;
    }

}