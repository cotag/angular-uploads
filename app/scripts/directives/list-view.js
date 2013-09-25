/**
*    CoTag Selectable
*    Abstract list management 
*    
*   Copyright (c) 2013 CoTag Media.
*    
*    @author     Stephen von Takach <steve@cotag.me>
*    @copyright  2013 cotag.me
* 
*     
*     References:
*        * 
*
**/


(function (angular) {
    'use strict';

    angular.module('coList', ['SafeApply', 'coAnimate']).

        directive('list', ['$window', '$document', '$safeApply', '$animation', function ($window, $document, $safeApply, $animation) {
            return {
                restrict: 'A',
                link: function (scope, element) {
                    var spaceAbove = 0,
                        virtualHeight = 0,
                        position = element.offset().top,    // pos.top
                        elWindow = angular.element($window),
                        winHeight = elWindow.height(),
                        items = 1,
                        scrollTop = 0,
                        prevStart,
                        prevEnd,
                        updateFiles = $animation(function () {
                            var start = 0,
                                end = 0;

                            // subtract scrolled distance from element position
                            spaceAbove = scrollTop - position;
                            if (spaceAbove > 0) {
                                start = Math.floor(spaceAbove / scope.height);
                                spaceAbove = start * scope.height;
                            } else {
                                spaceAbove = 0;
                                start = 0;
                            }

                            end = start + items + 1;

                            if (prevStart !== start || prevEnd !== end) {
                                prevStart = start;
                                prevEnd = end;
                            } else {
                                return false;
                            }
                        }, function () {
                            $safeApply(scope, function () {
                                scope.files = scope.manager.retrieve(prevStart, prevEnd);
                                element.css({
                                    'height': virtualHeight - spaceAbove + 'px',
                                    'margin-top': spaceAbove + 'px'
                                });
                            });
                        }),
                        resizing = function () {
                            winHeight = elWindow.height();
                            items = Math.ceil(winHeight / scope.height) * scope.perRow;
                            updateFiles();
                        },
                        scrolling = function () {
                            scrollTop = $document.scrollTop();
                            updateFiles();
                        };

                    scope.files = [];
                    scope.perRow = scope.perRow || 1;


                    $document.bind('scroll', scrolling);
                    elWindow.bind('resize', resizing);

                    // unbind the globals on destroy
                    scope.$on('$destroy', function () {
                        $document.unbind('scroll', scrolling);
                        elWindow.unbind('resize', resizing);
                    });

                    scope.$watch('manager.lastUpdated', function () {
                        virtualHeight = Math.ceil(scope.manager.fileCount() / scope.perRow) * scope.height;
                        prevStart = -1;
                        updateFiles();
                    });

                    scope.$watch('height', function () {
                        resizing();
                        updateFiles();
                    });
                }
            };
        }]);

}(this.angular));
