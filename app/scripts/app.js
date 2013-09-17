'use strict';

angular.module('angularUploadsApp', ['ngRoute', 'Condo'])
  .config(['$routeProvider', function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/upload.html',
        controller: 'MainCtrl'
      })
      .when('/new', {
        templateUrl: 'views/upload2.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  }]);
