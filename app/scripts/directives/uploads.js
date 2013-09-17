/**
*	CoTag Condo
*	Direct to cloud resumable uploads
*	
*   Copyright (c) 2013 CoTag Media.
*	
*	@author 	Stephen von Takach <steve@cotag.me>
* 	@copyright  2013 cotag.me
* 
* 	
* 	References:
*		* http://ie.microsoft.com/testdrive/ieblog/2011/oct/PointerDraw.js.source.html (detect click, touch etc on all platforms)
*		* http://docs.angularjs.org/guide/directive
*		* http://stackoverflow.com/questions/3758606/how-to-convert-byte-size-into-human-readable-format-in-java/3758880
*
**/


(function (angular) {
    'use strict';

    angular.module('Condo').

	// isolated circular progress bar
	directive('circlebar', ['$window', '$timeout', '$safeApply', function($window, $timeout, $safeApply) {
		return {
			template: '<div class="co-circle-progress">' +
						'<div class="co-circle bg"></div>' +
						'<div class="co-progress" ng-class="{gt50: progress > 180}">' +
							'<div class="co-circle"></div>' +
							'<div class="co-circle filled"></div>' +
						'</div>' +
						'<div class="circle-content">' +
							'<div><div ng-transclude></div></div>' +
						'</div>' +
					'</div>',
			transclude: true,
			replace: true,
			restrict: 'E',
			scope: {
				current: '=progress',
				total: '=total'
			},
			link: function(scope, element, attrs) {
				var next_half = false,		// used to coordinate the transition animation
					apply_progress = true,	// used to coordinate the transition animation
					progress_temp,			// holds the progress during the coordinated transition
					progressEl = element.find('div.co-progress > div:first-child'),
				    setWidth = function() {
						var width = element.width();
						element.css('font-size', width - (width % 2) + 'px');
					};

				// we have to use em's for the clip function to work with %
				setWidth();
				angular.element($window).bind('orientationchange resize', setWidth);

				// the current progress in degrees 0-360
				scope.progress = 0;
				scope.$watch('progress', function(pos) {
					progressEl.css({
						'-moz-transform':'rotate('+pos+'deg)',
						'-ms-transform':'rotate('+pos+'deg)',
						'-webkit-transform':'rotate('+pos+'deg)',
						'-o-transform':'rotate('+pos+'deg)',
						'transform':'rotate('+pos+'deg)'
					});
				});

				// we watch for changes to the progress indicator of the parent scope
				scope.$watch('current', function(newValue) {
					newValue = newValue / scope.total * 360;

					if (newValue > 180 && !next_half) {
						progress_temp = newValue;
						if (apply_progress) {
							apply_progress = false;
							scope.progress = 180;
							progressEl.bind('webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend', function() {
								progressEl.unbind('webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend');
								window.requestAnimationFrame(function() {
									$safeApply(scope, function () {
										scope.progress = progress_temp;
									});
								});
								next_half = true;
							});
						}
					} else if(newValue <= 180 && next_half) {
						progress_temp = newValue;
						if (!apply_progress) {
							apply_progress = true;
							scope.progress = 180.00001;
							progressEl.bind('webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend', function() {
								progressEl.unbind('webkitTransitionEnd mozTransitionEnd msTransitionEnd oTransitionEnd transitionend');
								window.requestAnimationFrame(function() {
									$safeApply(scope, function () {
										scope.progress = progress_temp;
									});
								});
								next_half = false;
							});
						}
					} else {
						scope.progress = newValue;
					}
				});
			}
		};
	}]).


	//
	// The individual upload events
	//	Triggers the pause, resume, abort functions
	//
	directive('uploadMain', ['$window', '$timeout', function($window, $timeout) {
		var PENDING = 0,
			STARTED = 1,
			PAUSED = 2,			// error or paused
			UPLOADING = 3,		
			COMPLETED = 4,
			ABORTED = 5;		// user cancelled

		return function(scope, element, attrs) {

				scope.size = 0; //scope.humanReadableByteCount(scope.upload.size, false);
				scope.progress = 0;
				scope.paused = false;
				scope.error = false;

				scope.$watch('selected_index', function(newValue, oldValue) {
					if (newValue === undefined) {
						scope.selected = undefined;
					} else {
						scope.selected = scope.uploads[scope.selected_index];
					}
				});

				scope.prettyProgress = function() {
					if (scope.selected)
					return Math.round(scope.selected.progress / 360 * 100);
				};

				scope.$watch('selected.state', function(newValue, oldValue) {
					scope.circle_style = {
						pending: newValue < UPLOADING && newValue != PAUSED,
						paused: newValue == PAUSED,
						error: scope.error,
						uploading: newValue > STARTED
					};
				});


				// ------------MOCK:

				scope.selected_index = undefined;
				scope.uploads = [];

				//scope.uploads[scope.selected].name ;
				//scope.uploads[scope.selected].size ;

				var update = function() {
					scope.selected.progress += 1;
					if (scope.selected.progress >= 360) {
						scope.selected.state = COMPLETED;

						$timeout(function() {
							scope.selected.state = UPLOADING;
							scope.selected.progress = 50;

							$timeout(function() {
								scope.selected.progress = 250;
								update();
							}, 5000);
						}, 2000);
					} else {
						progress_timer = $timeout(update, 100);
					}
				}, 
				progress_timer,
				playpause = function() {
					if(progress_timer) {
						$timeout.cancel(progress_timer);
						progress_timer = undefined;
						scope.paused = true;
					} else {
						scope.paused = false;
						progress_timer = $timeout(update, 100);
					}
				};

				$timeout(function() {
					scope.uploads = [{
						progress: 0,
						size: 360,
						name: 'somefile.jpg',
						state: PENDING
					}];
					scope.selected_index = 0;

					$timeout(function() {
						scope.selected.state = UPLOADING;
						update();
					}, 3000);
				}, 4000);
			
			};
	}]);

})(angular);