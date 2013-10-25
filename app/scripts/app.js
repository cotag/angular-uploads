
(function (angular) {
    'use strict';
    angular.module('angularUploadsApp', ['ngRoute', 'Condo', 'Orbicular']).
        config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
            $locationProvider.html5Mode(true);
            $routeProvider
                .when('/', {
                    templateUrl: 'views/upload.html',
                })
                .otherwise({
                    redirectTo: '/'
                });
        }]);
}(this.angular));
