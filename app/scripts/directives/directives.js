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
*        * http://ie.microsoft.com/testdrive/ieblog/2011/oct/PointerDraw.js.source.html (detect click, touch etc on all platforms)
*        * http://docs.angularjs.org/guide/directive
*        * http://stackoverflow.com/questions/3758606/how-to-convert-byte-size-into-human-readable-format-in-java/3758880
*
**/


(function(angular) {
    'use strict';
    
    
    
    angular.module('Condo').
    
    //
    // create a directive for attaching the input events
    //
    directive('coUploads', ['$timeout', '$safeApply', 'Condo.UploadManager', function($timeout, safeApply, fileMan) {

        return {
            controller: ['$scope', 'Condo.Api', function(scope, api) {
                scope.size_limit = undefined;
                scope.file_checker = function(file) {      // client side filtering of files
                    return true;
                };

                scope.playpause = function(file) {
                    if (file.upload && file.upload.state == 3) {                 // Uploading
                        file.upload.pause();
                    } else if (file.upload) {
                        file.upload.start();
                    } else {
                        file.upload = {
                            start: function() {},   // suppress errors
                            abort: function() {}
                        };
                        file.message = 'checking...';
                        if(scope.file_checker(file) && (!scope.size_limit || file.size <= scope.size_limit)) {
                            api.check_provider(scope.endpoint, file).then(function(upload) {
                                file.upload = upload;
                                upload.start();
                            }, function(failure) {
                                file.message = 'server rejected';
                                delete file.upload;
                            });
                        } else {
                            // File did not pass client side checks
                            file.message = 'file not supported';
                        }
                    }
                };
            }],
            link: function(scope, element, attrs) {
                var uploadsRunning = 0,
                    delegate = element,
                    drop_targets = element,
                    hover_class = 'drag-hover',
                    supress_notifications = false;
            
                //
                // See Condo.Config for configuration options
                //
                scope.endpoint = '/uploads';
                scope.autostart = true;
                scope.ignore_errors = true;            // Continue to autostart after an error?
                scope.parallelism = 1;                // number of uploads at once
                
                scope.remove_completed = false;    // Remove completed uploads automatically
                scope.manager = fileMan.newManager();
                scope.height = 35;  // TODO:: This needs to be dynamic
                
                
                //
                // Determine how to draw the element
                //
                if(document.implementation.hasFeature("org.w3c.svg", "1.0")) {
                    element.addClass('supports-svg');
                } else {
                    element.addClass('no-svg');
                }
                    
                    
                //
                // Detect file drops
                //
                drop_targets = angular.element(drop_targets);
                delegate.on('drop.condo', drop_targets, function(event) {
                    drop_targets.removeClass(hover_class);
                    
                    //
                    // Prevent propagation early (so any errors don't cause unwanted behaviour)
                    //
                    event.preventDefault();
                    event.stopPropagation();
                    
                    scope.manager.add(
                        event.originalEvent.dataTransfer.items ||
                        event.originalEvent.dataTransfer.files
                    );
                }).on('dragover.condo', drop_targets, function(event) {
                    angular.element(this).addClass(hover_class);
                    
                    return false;
                }).on('dragleave.condo', drop_targets, function(event) {
                    angular.element(this).removeClass(hover_class);
                    
                    return false;
                }).
                
                
                //
                // Detect manual file uploads
                //
                on('change.condo', ':file', function(event) {
                    scope.manager.add(angular.element(this)[0].files);
                    angular.element(this).parents('form')[0].reset();
                });
                
                
                //
                // Clean up any event handlers
                //
                scope.$on('$destroy', function() {
                    drop_targets.off('.condo');
                    delegate.off('.condo');
                    element.removeClass('supports-svg').removeClass('no-svg');
                });


                


                //
                // Watch autostart and trigger a check when it is changed
                //
                scope.$watch('autostart', function(newValue, oldValue) {
                    if (newValue === true) {
                        
                    }
                });
                
                
                //
                // Autostart more uploads as this is bumped up
                //
                scope.$watch('parallelism', function(newValue, oldValue) {
                    if(newValue > oldValue) {
                        
                    }
                });
                
                
                //
                // Notification service
                //    {
                //        type: 'warn'|'error',
                //        number: 1
                //        file (optional)
                //        details (optional)
                //    }
                //
                var messages = {
                    warn: ['file not accepted', 'file add failed - server rejected'],
                    error: ['file add failed - missing required uploader', 'failed to load file fingerprinting component']
                };
                scope.$on('coNotice', function(event, data) {
                    if(!supress_notifications && data.type != 'info')
                        alert(data.type + ': ' + messages[data.type][data.number]);
                });
            }
        }
    }]).
    
    
    //
    // The individual upload events
    //    Triggers the pause, resume, abort functions
    //
    directive('coUpload', ['$safeApply', function (safeApply) {
        var PENDING = 0,
            STARTED = 1,
            PAUSED = 2,
            UPLOADING = 3,
            COMPLETED = 4,
            ABORTED = 5,

            humanReadableByteCount = function (bytes, si) {
                var unit = si ? 1000.0 : 1024.0;
                if (bytes < unit) return bytes + (si ? ' iB' : ' B');
                var exp = Math.floor(Math.log(bytes) / Math.log(unit)),
                    pre = (si ? 'kMGTPE' : 'KMGTPE').charAt(exp-1) + (si ? 'iB' : 'B');
                return (bytes / Math.pow(unit, exp)).toFixed(1) + ' ' + pre;
            };
        
        return function(scope, element, attrs) {
            
            scope.size = humanReadableByteCount(scope.file.size, false);
            scope.progress = 0;
            scope.paused = true;
            
            scope.$watch('file.upload.state', function (newValue, oldValue) {
                switch(newValue) {
                    case STARTED:
                        scope.paused = false;
                        scope.file.message = 'starting...';
                        break;
                        
                    case UPLOADING:
                        element.find('div.bar').addClass('animate');
                        scope.file.message = undefined;
                        scope.paused = false;
                        break;
                        
                    case COMPLETED:
                        scope.file.message = 'complete';
                        element.find('td.controls').replaceWith( '<td class="blank" />' );
                        element.find('div.bar').removeClass('animate');
                        
                        if(scope.remove_completed) {
                            scope.animate_remove();
                        } else {
                            
                        }
                        break;
                        
                    case PAUSED:
                        element.find('div.bar').removeClass('animate');
                        if (scope.file.message === undefined) {
                            scope.file.message = 'paused';
                        }
                            
                        scope.paused = true;
                        // No need for break
                        
                        if (scope.ignore_errors && scope.file.upload && scope.file.upload.error) {
                            
                        }
                }
            });
            
            scope.$watch('file.upload.progress', function (newValue, oldValue) {
                scope.progress = (newValue || 0) / scope.file.size * 100;
            });

            scope.$watch('file.upload.message', function (newValue, oldValue) {
                scope.file.message = newValue;
            });
            
            scope.animate_remove = function () {
                if (scope.file.upload) {
                    scope.file.upload.abort();
                }
                
                element.fadeOut(800, function () {
                    safeApply(scope, function () {
                        scope.manager.remove(scope.file);
                    });
                });
            };
            
        };
    }]).
    
    
    //
    // Toggling options
    //    based on: https://github.com/angular-ui/bootstrap/tree/master/src/dropdownToggle
    //
    directive('dropdownToggle', ['$document', '$location', '$window', function ($document, $location, $window) {
        var openElement = null, close;
        return {
            restrict: 'CA',
            link: function(scope, element, attrs) {
                scope.$watch(function dropdownTogglePathWatch() {return $location.path();}, function dropdownTogglePathWatchAction() {
                    if (close) { close(); }
                });
                
                element.parent().bind('click', function(event) {
                    event.stopPropagation();
                });
                
                element.bind('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    var iWasOpen = false;
                    
                    if (openElement) {
                        iWasOpen = openElement === element;
                        close();
                    }
                    
                    if (!iWasOpen){
                        element.parent().addClass('open');
                        openElement = element;
                        
                        close = function (event) {
                            if (event) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                            $document.unbind('click', close);
                            element.parent().removeClass('open');
                            close = null;
                            openElement = null;
                        };
                        
                        $document.bind('click', close);
                    }
                });
                
                
                //
                // Center the pop-up, based on CSS location of the button
                //
                var popup = element.next('ul.dropdown-menu');
                popup.css('margin-left', -(popup.width() / 2) + 'px');
            }
        };
    }]);
    
}(this.angular));
