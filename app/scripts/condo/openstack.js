/**
*    CoTag Condo Rackspace Cloud Files Strategy
*    Direct to cloud resumable uploads for Rackspace Cloud Files
*    
*   Copyright (c) 2012 CoTag Media.
*    
*    @author     Stephen von Takach <steve@cotag.me>
*     @copyright  2012 cotag.me
* 
*     
*     References:
*        * 
*
**/


(function (angular) {
    'use strict';

    angular.module('Condo').

        factory('Condo.Openstack', ['$q', 'Condo.Md5', function ($q, md5) {
            var PENDING = 0,
                STARTED = 1,
                PAUSED = 2,
                UPLOADING = 3,
                COMPLETED = 4,
                ABORTED = 5,

                Openstack = function (api, file) {
                    var self = this,
                        strategy = null,
                        part_size = 2097152,            // Multi-part uploads should be bigger then this
                        pausing = false,
                        defaultError = function (reason) {
                            self.error = !pausing;
                            pausing = false;
                            self.pause(reason);
                        },

                        restart = function () {
                            strategy = null;
                        },


                        completeUpload = function () {
                            api.update().then(function () {
                                self.progress = self.size;    // Update to 100%
                                self.state = COMPLETED;
                            }, defaultError);
                        },

                        //
                        // We need to sign our uploads so rackspace can confirm they are valid for us
                        //
                        build_request = function (part_number) {
                            var current_part,
                                endbyte;

                            if (file.size > part_size) {        // If file bigger then 5mb we expect a chunked upload
                                endbyte = part_number * part_size;
                                if (endbyte > file.size) {
                                    endbyte = file.size;
                                }
                                current_part = file.slice((part_number - 1) * part_size, endbyte);
                            } else {
                                current_part = file;
                            }

                            return md5.hash(current_part).then(function (val) {
                                return {
                                    data: current_part,
                                    data_id: val,
                                    part_number: part_number
                                };
                            }, function (reason) {
                                return $q.reject(reason);
                            });
                        },

                        //
                        // Direct file upload strategy
                        //
                        OpenstackDirect = function (data) {
                            //
                            // resume
                            // abort
                            // pause
                            //
                            var $this = this,
                                finalising = false;

                            //
                            // Update the parent
                            //
                            self.state = UPLOADING;

                            //
                            // This will only be called when the upload has finished and we need to inform the application
                            //
                            $this.resume = function () {
                                self.state = UPLOADING;
                                completeUpload();
                            };

                            $this.pause = function () {
                                api.abort();

                                if (!finalising) {
                                    restart();        // Should occur before events triggered
                                    self.progress = 0;
                                }
                            };

                            //
                            // AJAX for upload goes here
                            //
                            data.data = file;
                            api.process_request(data, function (progress) {
                                self.progress = progress;
                            }).then(function () {
                                finalising = true;
                                $this.resume();                // Resume informs the application that the upload is complete
                            }, function (reason) {
                                self.progress = 0;
                                defaultError(reason);
                            });
                        }, // END DIRECT


                        //
                        // Chunked upload strategy--------------------------------------------------
                        //
                        OpenstackChunked = function (data, first_chunk) {
                            //
                            // resume
                            // abort
                            // pause
                            //
                            var part_ids = {},
                                last_part = 0,

                                generatePartManifest = function () {
                                    var parts = [],
                                        i,
                                        etag;

                                    for (i = 1; i < 10000; i += 1) {
                                        etag = part_ids[i];

                                        if (etag) {
                                            parts.push({
                                                path: etag.path,
                                                etag: etag.md5,
                                                size_bytes: etag.size_bytes
                                            });
                                        } else {
                                            break;
                                        }
                                    }

                                    return JSON.stringify(parts);
                                },

                                //
                                // Get the next part signature
                                //
                                next_part = function (part_number) {
                                    //
                                    // Check if we are past the end of the file
                                    //
                                    if ((part_number - 1) * part_size < file.size) {

                                        self.progress = (part_number - 1) * part_size;    // Update the progress

                                        build_request(part_number).then(function (result) {
                                            if (self.state !== UPLOADING) {
                                                return;                        // upload was paused or aborted as we were reading the file
                                            }

                                            var mem = [{
                                                part: part_number,
                                                md5: result.data_id,
                                                size_bytes: result.data.size
                                            }];
                                            part_ids[part_number] = mem[0];

                                            // We want to save the previous part as it has the path
                                            // information added
                                            mem[0] = part_ids[part_number - 1] || mem[0];

                                            api.update({
                                                resumable_id: part_number,
                                                file_id: result.data_id,
                                                part: part_number,
                                                part_data: mem,
                                                part_list: [part_number]
                                            }).then(function (data) {
                                                part_ids[part_number].path = data.path;

                                                set_part(data, result);
                                            }, defaultError);

                                        }, defaultError);    // END BUILD_REQUEST

                                    } else {
                                        //
                                        // We're after the final commit
                                        //
                                        api.edit('finish').
                                            then(function (request) {
                                                request.data = generatePartManifest();
                                                api.process_request(request).then(completeUpload, defaultError);
                                            }, defaultError);
                                    }
                                },

                                //
                                // Send a part to rackspace
                                //
                                set_part = function (request, part_info) {
                                    request.data = part_info.data;
                                    api.process_request(request, function (progress) {
                                        self.progress = (part_info.part_number - 1) * part_size + progress;
                                    }).then(function () {
                                        last_part = part_info.part_number;
                                        next_part(last_part + 1);
                                    }, function (reason) {
                                        self.progress = (part_info.part_number - 1) * part_size;
                                        defaultError(reason);
                                    });
                                };


                            self.state = UPLOADING;

                            this.resume = function () {
                                self.state = UPLOADING;
                                next_part(last_part + 1);
                            };

                            this.pause = function () {
                                api.abort();
                            };

                            //
                            // We need to check if we are resuming or starting an upload
                            //
                            if (data.type === 'parts') {
                                if (data.part_data) {
                                    part_ids = data.part_data;
                                }
                                next_part(data.current_part);
                            } else {
                                api.update({
                                    resumable_id: 'n/a',
                                    file_id: first_chunk.data_id,
                                    part: 1
                                }).then(function (data) {
                                    part_ids[1] = {
                                        part: 1,
                                        md5: first_chunk.data_id,
                                        size_bytes: first_chunk.data.size,
                                        path: data.path
                                    };

                                    set_part(data, first_chunk);        // Parts start at 1
                                }, function (reason) {
                                    defaultError(reason);
                                    restart();                // Easier to start from the beginning
                                });
                            }
                        }; // END CHUNKED

                    //
                    // Variables required for all drivers
                    //
                    this.state = PENDING;
                    this.progress = 0;
                    this.message = 'pending';
                    this.name = file.name;
                    this.size = file.size;
                    this.error = false;

                    //
                    // Support file slicing
                    //    
                    if (typeof (file.slice) !== 'function') {
                        file.slice = file.webkitSlice || file.mozSlice;
                    }

                    this.start = function () {
                        if (strategy === null) {    // We need to create the upload

                            pausing = false;
                            this.error = false;

                            //
                            // Update part size if required
                            //
                            if ((part_size * 9999) < file.size) {
                                part_size = file.size / 9999;
                                if (part_size > (5 * 1024 * 1024 * 1024)) {        // 5GB limit on part sizes
                                    this.abort('file exceeds allowable size');
                                    return;
                                }
                            }

                            this.message = null;
                            this.state = STARTED;
                            strategy = {};            // This function shouldn't be called twice so we need a state (TODO:: fix this)

                            build_request(1).then(function (result) {
                                if (self.state !== STARTED) {
                                    return;                        // upload was paused or aborted as we were reading the file
                                }

                                api.create({file_id: result.data_id}).
                                    then(function (data) {
                                        if (data.type === 'direct_upload') {
                                            strategy = new OpenstackDirect(data);
                                        } else {
                                            strategy = new OpenstackChunked(data, result);
                                        }
                                    }, defaultError);

                            }, defaultError);    // END BUILD_REQUEST

                        } else if (this.state === PAUSED) {                // We need to resume the upload if it is paused
                            pausing = false;
                            this.error = false;
                            this.message = null;
                            strategy.resume();
                        }
                    };

                    this.pause = function (reason) {
                        if (strategy !== null && this.state === UPLOADING) {    // Check if the upload is uploading
                            this.state = PAUSED;
                            pausing = true;
                            strategy.pause();
                        } else if (this.state <= STARTED) {
                            this.state = PAUSED;
                            restart();
                        }
                        if (this.state === PAUSED) {
                            this.message = reason;
                        }
                    };

                    this.abort = function (reason) {
                        if (strategy !== null && this.state < COMPLETED) {    // Check the upload has not finished
                            var old_state = this.state;

                            this.state = ABORTED;
                            api.abort();

                            //
                            // As we may not have successfully deleted the upload
                            //    or we aborted before we received a response from create
                            //
                            restart();    // nullifies strategy

                            //
                            // if we have an upload_id then we should destroy the upload
                            //    we won't worry if this fails as it should be automatically cleaned up by the back end
                            //
                            if (old_state > STARTED) {
                                api.destroy();
                            }

                            this.message = reason;
                        }
                    };
                }; // END RACKSPACE

            return {
                new_upload: function (api, file) {
                    return new Openstack(api, file);
                }
            };
        }])

        .run(['Condo.Openstack', 'Condo.Api', function (openstack, api) {
            api.register('OpenStackSwift', openstack);
        }]);

}(this.angular));
