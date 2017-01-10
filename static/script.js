var projetApp = angular.module('projetApp', ['ngRoute']).service('sharedProperties', function (){
    var user;
	var compaign;
	var userCalled;

    return {
        getUser: function () {
            return user;
        },
        setUser: function(value) {
            user = value;
        },
		getUserCalled: function () {
            return userCalled;
        },
        setUserCalled: function(value) {
            userCalled = value;
        },
		getCompaign: function () {
            return compaign;
        },
        setCompaign: function(value) {
            compaign = value;
        }
    };
});

projetApp.factory('SharedService', function() {
  return {
    sharedObject: {
		user: '',
		userCalled: '',
		compaign: ''
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
		
		.when('/compaigns', {
			templateUrl : 'pages/compaigns.html',
			controller  : 'compaignsController'
		})
		
		.when('/compaign', {
			templateUrl : 'pages/compaign.html',
			controller  : 'compaignController'
		})
		
		.when('/search', {
			templateUrl : 'pages/search.html',
			controller  : 'searchController'
		})
		
		.when('/call', {
			templateUrl : 'pages/call.html',
			controller  : 'callController'
		})
});

projetApp.run(function($rootScope, $location, sharedProperties) {
  $rootScope.$on('$routeChangeSuccess', function(event, next, current) {
		if (typeof sharedProperties.getUser() == 'undefined' && $location.path() != '/signup') {
			$location.url("/");
		}
  });
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
				sharedProperties.setUser(data.user);
				console.log(data.user);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
		delete user.password;
	}
});

projetApp.controller('signupController', function($scope, $http, $location, sharedProperties) {
	$scope.message= '';
	$scope.user = 
	{
		"type":0
	};
	
	$scope.changeType = function(type) {
		$scope.user.type = type;
	}
	
	$scope.registerUser = function(user) {
		if (typeof user.email === 'undefined' || typeof user.password === 'undefined' ||
			typeof user.cPassword === 'undefined' || typeof user.address === 'undefined' ||
			typeof user.cin === 'undefined' || (user.type == 2 && typeof user.matricule === 'undefined') ) {
			$scope.message = 'Error : Missing fields';
			console.log('Error : Missing fields');
			return 'Error : Missing fields';
		}
		
		if ( user.email.length == 0 || user.password.length == 0 ||
			user.cPassword.length == 0 || user.address.length == 0 ||
			user.cin.length != 8 || (user.type == 2 && user.matricule.length == 0) ) {
			$scope.message = 'Error : Please check all your fields';
			console.log('Error : Please check all your fields');
			return 'Error : Please check all your fields';
		}
		
		if (user.cPassword != user.password) {
			$scope.message = 'Error : Please check your passwords';
			console.log('Error : Please check your passwords');
			return 'Error : Please check your passwords';
		}
		
		user.password = CryptoJS.SHA256(user.password).toString();
		delete user.cPassword;
		console.log(JSON.stringify(user));
		$http.post("/register", JSON.stringify(user), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.message = 'User added successfully.';
			console.log('User added successfully.');
			$location.path("/");
        }).
		error(function(data, status) {
            $scope.message = 'unknown error';
			console.log('unknown error');
        });
		delete user.password;
	}
});

projetApp.controller('compaignsController', function($scope, $http, sharedProperties) {
	$scope.user = sharedProperties.getUser();
	$scope.message = 'Welcome to the dashboard';
	$scope.choice = 0;
	$scope.compaigns;
	
	$scope.changeChoice = function(choice) {
		$scope.choice = choice;
	}
	
	$scope.addCompaign = function(compaign) {
		compaign.creator_id = $scope.user.id;
		$http.post("/addCompaign", JSON.stringify(compaign), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.status = data.message;
			$scope.color = data.color;
			if (data.status == 1) {
				console.log(data);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
	
	$scope.editCompaign = function(compaign) {
		$scope.compaign = compaign;
		$scope.changeChoice(3);
	}
	
	$scope.LunchEditCompaign = function(compaign) {
		compaign.creator_id = $scope.user.id;
		$http.post("/editCompaign", JSON.stringify(compaign), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.status = data.message;
			$scope.color = data.color;
			if (data.status == 1) {
				console.log(data);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
	
	$scope.deleteCompaign = function(compaign) {
		$scope.changeChoice(0);
		compaign.creator_id = $scope.user.id;
		$http.post("/deleteCompaign", JSON.stringify(compaign), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.status = data.message;
			$scope.color = data.color;
			if (data.status == 1) {
				console.log(data);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
	
	$scope.showCompaigns = function() {
		$scope.changeChoice(1);
		
		$http.get("/getCompaigns").
        success(function(data, status) {
            console.log('Compaigns fetched successfully.');
			console.log(data);
			$scope.compaigns = data;
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
	
	$scope.joinCompaign = function(id) {
		var obj = new Object();
		obj.user_id = $scope.user.id;
		obj.compaign_id = id;
		obj.date = new Date();

		$http.post("/joinCompaign", JSON.stringify(obj), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {
            $scope.status = data.message;
			$scope.color = data.color;
			if (data.status == 1) {
				console.log(data);
			}
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
});

projetApp.controller('dashboardController', function($scope, $http, $location, sharedProperties) {
	$scope.user = sharedProperties.getUser();
	$scope.message = 'Welcome to the dashboard';
	$scope.compaigns;
	
	$scope.$on('$viewContentLoaded', function() {
		if (typeof sharedProperties.getUser() != 'undefined') {
			$scope.showCompaigns();
		}
	});
	
	$scope.enterCompaign = function(compaign) {
		sharedProperties.setCompaign(compaign);
		$location.path("/compaign");
	}
	
	$scope.showCompaigns = function() {
		var obj = new Object();
		obj.user_id = $scope.user.id;
		
		$http.post("/getCompaignsById", JSON.stringify(obj), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {	
			$scope.compaigns = data;
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
});

projetApp.controller('searchController', function($scope, $http, sharedProperties) {
	$scope.user = sharedProperties.getUser();
	$scope.compaign = sharedProperties.getCompaign();
	$scope.message = 'Here you can select user to add.';
	$scope.users;
	
	$scope.$on('$viewContentLoaded', function() {
		if (typeof sharedProperties.getUser() != 'undefined') {
			$scope.showContacts();
		}
	});
	
	$scope.addUser = function(user) {
		var obj = new Object();
		obj.user1_id = $scope.user.id;
		obj.user2_id = user.user_id;
		obj.compaign_id = $scope.compaign.id;
		obj.room_id = CryptoJS.MD5(obj.user1_id + '-' + obj.user2_id + ':' + obj.compaign_id).toString();
		obj.date = new Date();
		
		$http.post("/addUser", JSON.stringify(obj), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {	
			console.log(data);
			$scope.message = data.message;
        }).
		error(function(data, status) {
            console.log('unknown error');
			$scope.message = 'Unknown error.';
        });
	}
	
	$scope.showContacts = function() {
		var obj = new Object();
		obj.user_id = $scope.user.id;
		obj.compaign_id = $scope.compaign.id;
		
		$http.post("/getUsers", JSON.stringify(obj), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {	
			$scope.users = data;
			console.log(data);
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
});

projetApp.controller('compaignController', function($scope, $http, $location, sharedProperties) {
	$scope.users;
	$scope.user = sharedProperties.getUser();
	$scope.compaign = sharedProperties.getCompaign();
	
	$scope.$on('$viewContentLoaded', function() {
		if (typeof sharedProperties.getUser() != 'undefined') {
			$scope.showContacts();
		}
	});
	
	$scope.showContacts = function() {
		var obj = new Object();
		obj.user_id = $scope.user.id;
		obj.compaign_id = $scope.compaign.id;
		
		$http.post("/getUsersById", JSON.stringify(obj), {'Content-Type': 'application/json;charset=utf-8;'}).
        success(function(data, status) {	
			$scope.users = data;
			console.log(data);
        }).
		error(function(data, status) {
            console.log('unknown error');
        });
	}
	
	$scope.callUser = function(user) {
		sharedProperties.setUserCalled(user);
		$location.path("/call");
		
	}
});

projetApp.controller('callController', function($scope, $http, sharedProperties) {
	$scope.user = sharedProperties.getUser();
	$scope.compaign = sharedProperties.getCompaign();
	$scope.userCalled = sharedProperties.getUserCalled();

	$scope.$on('$viewContentLoaded', function() {
		console.log($scope.userCalled.room_id);
		connect($scope.userCalled.room_id, $scope.userCalled.email);
	});
});