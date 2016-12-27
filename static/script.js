var projetApp = angular.module('projetApp', ['ngRoute']).service('sharedProperties', function (){
    var user;

    return {
        getUser: function () {
            return user;
        },
        setUser: function(value) {
            user = value;
        }
    };
});

projetApp.factory('SharedService', function() {
  return {
    sharedObject: {
		user: ''
    }
  };
});

projetApp.config(function($routeProvider) {
	$routeProvider
        .when('/', {
			templateUrl : 'pages/login.html',
			controller  : 'mainController'
		})

		.when('/signup', {
			templateUrl : 'pages/signup.html',
			controller  : 'signupController'
		})
		
		.when('/dashboard', {
			templateUrl : 'pages/dashboard.html',
			controller  : 'dashboardController'
		})
});

projetApp.controller('mainController', function($scope, $http, $location, sharedProperties) {
	$scope.message = 'Please log in in order to use our application';
	$scope.status = '';
	$scope.color = 'white';
	
	$scope.loginUser = function(user) {
		user.password = CryptoJS.SHA256(user.password).toString();
		$http.post("/login", JSON.stringify(user), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.status = data.message;
			$scope.color = data.color;
			if (data.status == 1) {
				$location.path("/dashboard");
				sharedProperties.setUser(user);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
		delete user.password;
	}
});

projetApp.controller('signupController', function($scope, $http, $location, sharedProperties) {
	$scope.user = {"type":0};
	$scope.changeType = function(type) {
		$scope.user.type = type;
	}
	
	$scope.registerUser = function(user) {
		if (typeof user.email === 'undefined' || typeof user.password === 'undefined' ||
			typeof user.cPassword === 'undefined' || typeof user.address === 'undefined' ||
			typeof user.cin === 'undefined' || (user.type == 2 && typeof user.matricule === 'undefined') ) {
			
			console.log('Error : Missing fields');
			return 'Error : Missing fields';
		}
		
		if ( user.email.length == 0 || user.password.length == 0 ||
			user.cPassword.length == 0 || user.address.length == 0 ||
			user.cin.length != 8 || (user.type == 2 && user.matricule.length == 0) ) {
			console.log('Error : Please check all your fields');
			return 'Error : Please check all your fields';
		}
		
		if (user.cPassword != user.password) {
			console.log('Error : Please check your passwords');
			return 'Error : Please check your passwords';
		}
		
		user.password = CryptoJS.SHA256(user.password).toString();
		delete user.cPassword;
		console.log(JSON.stringify(user));
		$http.post("/register", JSON.stringify(user), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            console.log('User added successfully.');
			$location.path("/");
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
		delete user.password;
	}
});

projetApp.controller('dashboardController', function($scope, sharedProperties) {

	$scope.message = sharedProperties.getUser().email;
	
});