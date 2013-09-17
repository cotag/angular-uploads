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
*		* http://fromanegg.com/post/41302147556/100-pure-css-radial-progress-bar
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
					    	// Width must be an even px for the effect to work.
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
		}]);

})(angular);