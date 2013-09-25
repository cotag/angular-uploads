(function (worker) {
    'use strict';

    var hasher = new worker.CondoMD5Hasher(worker.postMessage, true);    // Accepts the callback as the parameter

    // Hook-up worker input
    worker.onmessage = function (e) {
        hasher.hash(e.data);
    };

}(this));
