(function (window) {
    'use strict';

    window.CondoHashWorkerEmulator = function (callback) {

        // Create an instance of downloader.
        var messageEvtEmulator = function (rawMessage) {
                callback({ data: rawMessage });
            },
            hasher = new window.CondoMD5Hasher(messageEvtEmulator, false);

        // Create an API that looks like postMessage
        this.postMessage = function (data) {   // , portArray
            hasher.hash(data);    // Clone the data if required JSON.parse(JSON.stringify(message)); // - Don't think it is required
        };

        this.terminate = function () {
            // No special clean-up needed.
        };
    };

}(this));
