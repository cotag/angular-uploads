/**
*    CoTag Condo
*    Direct to cloud resumable uploads
*    
*   Copyright (c) 2012 CoTag Media.
*    
*    @author     Stephen von Takach <steve@cotag.me>
*     @copyright  2012 cotag.me
* 
*     
*     References:
*        * http://docs.angularjs.org/api/ng.$http
*        * http://docs.angularjs.org/api/ng.$q
*
**/


(function(angular) {
    'use strict';
    
    angular.module('Condo').

        // Handles the list of files being uploaded
        // Abstracting the list from the view itself
        factory('Condo.UploadManager', ['$window', '$q', '$safeApply', function($window, $q, $safeApply) {
            

            var returnFalse = function () {return false;},
                getManager = function(settings) {
                    var processing = undefined,
                        pending = [],
                        files = [],
                        totalSize = 0,
                        filesAdded = 0,

                        // triggers updates and resolves the promise
                        completeProcess = function() {
                            api.lastUpdated = Date.now();
                            processing.resolve(filesAdded);
                            processing = undefined;
                        },

                        // Extracts the files from the folders
                        processPending = function () {
                            if (pending.length > 0) {
                                var item = pending.shift(),
                                    items = item.items,
                                    length = items.length;
                                
                                if(item.folders) {
                                    var i = 0,
                                        entry,
                                        obj,
                                        count = 0,
                                        new_items = [],
                                        checkCount = function() {
                                            //
                                            // Counts the entries processed so we can add any files to the queue
                                            //
                                            count += 1;
                                            if (count >= length) {
                                                if(new_items.length > 0) {
                                                    pending.unshift({    // add any files to the start of the queue
                                                        items: new_items,
                                                        folders: false
                                                    });
                                                }
                                                $window.setTimeout(processPending, 0);
                                            }
                                        },
                                        processEntry = function(entry, path) {
                                            //
                                            // If it is a directory we add it to the pending queue
                                            //
                                            try {
                                                if (entry.isDirectory) {
                                                    entry.createReader().readEntries(function (entries) {
                                                        pending.push({
                                                            items: entries,
                                                            folders: true,
                                                            path: path + entry.name + '/'
                                                        });
                                                        checkCount();
                                                    });
                                                } else if (entry.isFile) {            // Files are added to a file queue
                                                    entry.file(function (file) {
                                                        if(path.length > 0) {
                                                            file.dir_path = path;
                                                        }

                                                        if (file.size > 0) {
                                                            new_items.push(file);
                                                        }
                                                        
                                                        checkCount();
                                                    });
                                                } else {
                                                    checkCount();
                                                }
                                            } catch(err) {
                                                checkCount();
                                            }
                                        };
                                    
                                    for (; i < length; i++) {
                                        
                                        //
                                        // first layer of DnD folders require you to getAsEntry
                                        //
                                        if(item.path.length == 0) {
                                            obj = items[i];
                                            obj.getAsEntry = obj.getAsEntry || obj.webkitGetAsEntry || obj.mozGetAsEntry || obj.msGetAsEntry;
                                            if(!!obj.getAsEntry) {
                                                entry = obj.getAsEntry();
                                            } else {
                                                entry = obj.getAsFile() // Opera support
                                                if (entry.size > 0) {
                                                    new_items.push(entry);
                                                }
                                                checkCount();
                                                continue;
                                            }
                                        } else {
                                            entry = items[i];
                                        }
                                        processEntry(entry, item.path);
                                    }
                                // Regular files where we can add them all at once
                                } else {
                                    files.push.apply(files, items);
                                    // Delay until next tick (delay and invoke apply are optional)
                                    $window.setTimeout(processPending, 0);
                                }
                            } else {
                                $safeApply(completeProcess);
                            }
                        },

                        // files or files and folders
                        addFiles = function (files) {
                            if (files.length === 0) {
                                return;
                            }

                            // Check if items or files
                            if (!!files[0].kind) {
                                pending.push({
                                    items: files,
                                    folders: true,
                                    path: ''
                                });
                            } else {
                                var copy = [],
                                    i = 0;

                                // Clone the files array
                                for (; i < files.length; i += 1) {
                                    copy.push(files[i]);
                                }

                                // Add to pending
                                pending.push({
                                    items: copy
                                });
                            }

                            // process if we are not already
                            if (!processing) {
                                processing = $q.defer();
                                filesAdded = 0;
                                processPending();
                            }

                            // promise to provide an update to listeners
                            processing.promise;
                        },

                        // TODO::
                        sortAttr = 'added',
                        sortDesc = false,
                        sortFunc = function(a, b) {
                            if (sortDesc) {

                            } else {

                            }
                        },
                        api = {
                            orderBy: 'attribute name and trigger update',
                            retrieve: function(start, end) {
                                if (end === undefined) {
                                    end = start;
                                    start = 0;
                                }

                                return files.slice(start, end);
                            },
                            folder: returnFalse,
                            add: addFiles,
                            remove: function () {
                                var args = arguments,
                                    i = 0,
                                    index;

                                for (; i < args.length; i += 1) {
                                    index = files.indexOf(args[i]);
                                    if (index >= 0) {
                                        files.splice(index, 1);
                                    }
                                }
                            },
                            fileCount: function () {
                                return files.length;
                            },
                            folderSize: function () {
                                return totalSize;
                            },
                            lastUpdated: Date.now()
                        };

                    // The public API
                    return api;
                };
            
            return {
                newManager: getManager
            };
        }]);
    
}(this.angular));
