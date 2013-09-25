(function (jQuery, angular) {
    'use strict';

    angular.module('Condo').

        factory('Condo.Md5', ['$window', '$rootScope', '$q', 'Condo.Config', function (window, $rootScope, $q, config) {

            var hasher,
                queue = [],
                ready = false,
                processing,

                //
                // starts processing the next item if the queue is not empty
                //
                processNext = function () {
                    if (ready && processing === undefined && queue.length > 0) {
                        processing = queue.pop();
                        hasher.postMessage(processing.blob);
                    }
                },

                //
                // Resolves the hashing promise
                //
                recievedMessage = function (e) {
                    if (e.data.success) {
                        processing.result.resolve(e.data.result);
                    } else {
                        processing.result.reject(e.data.result);
                    }

                    processing = undefined;
                    processNext();

                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();                    // This triggers the promise response
                    }
                };

            if (!!window.Worker) {
                hasher = new window.Worker(config.md5_worker);
                hasher.onmessage = recievedMessage;
                hasher.onerror = function () {
                    ready = false;
                    $rootScope.$broadcast('coNotice', {
                        type: 'error',
                        number: 1
                    });
                };
                ready = true;
            } else {
                jQuery.getScript(config.md5_emulated_worker, function () {
                    hasher = new window.CondoHashWorkerEmulator(recievedMessage);
                    ready = true;
                    processNext();    // It is possible
                }).fail(function () {
                    $rootScope.$broadcast('coNotice', {
                        type: 'error',
                        number: 1
                    });
                });
            }

            return {
                //
                // Will queue a start message and return the hash result
                //
                hash: function (blob) {
                    var result = $q.defer();

                    queue.push({
                        blob: blob,
                        result: result
                    });
                    processNext();

                    return result.promise;
                }
            };
        }]);

}(this.jQuery, this.angular));

