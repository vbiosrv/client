angular
    .module('shm_user', [
])
.controller('ShmUserController',
    ['$scope','$location','$route','shm_request','shm_pays', function($scope, $location, $route, shm_request, shm_pays) {
    'use strict';

    shm_request('GET','v1/user' ).then(function(response) {
        $scope.data = response.data.data[0];
        // Загружаем telegram username отдельно
        $scope.loadTelegramUsername();
    });

    $scope.partnerUrlToClipboard = function(string) {
        navigator.clipboard.writeText( $location.absUrl() + '?partner_id=' + $scope.data.user_id );
    }

    $scope.save = function() {
        // Сначала сохраняем telegram username, затем основные данные
        $scope.saveTelegramUsername().then(function() {
            // Создаем копию данных без telegram настроек для основного сохранения
            var dataToSave = angular.copy($scope.data);
            if (dataToSave.settings && dataToSave.settings.telegram) {
                delete dataToSave.settings.telegram;
            }

            shm_request('POST_JSON','v1/user', dataToSave ).then(function(response) {
                $scope.data = response.data.data[0];
                // Восстанавливаем telegram данные после основного сохранения
                $scope.loadTelegramUsername();
                $location.path('/user');
            })
        });
    }

    $scope.saveTelegramUsername = function() {
        if ($scope.data.settings && $scope.data.settings.telegram &&
            $scope.data.settings.telegram.username !== null &&
            $scope.data.settings.telegram.username !== undefined) {
            var payload = {
                username: $scope.data.settings.telegram.username || ""
            };
            return shm_request('POST_JSON','v1/telegram/user', payload );
        }
        return Promise.resolve();
    }

    $scope.loadTelegramUsername = function() {
        shm_request('GET','v1/telegram/user' ).then(function(telegramResponse) {
            if (!$scope.data.settings) {
                $scope.data.settings = {};
            }
            if (!$scope.data.settings.telegram) {
                $scope.data.settings.telegram = {};
            }
            $scope.data.settings.telegram.username = telegramResponse.data.username;
        });
    }

    $scope.passwd = function () {
        var new_password = prompt("Enter new password:");
        if ( new_password ) {
            shm_request('POST_JSON','v1/user/passwd', { password: new_password } ).then(function() {
                $location.path('/user');
            })
        }
    }

    $scope.pay = function() {
        shm_pays.make_pay().result.then(function(data){
        }, function(cancel) {
        });
    };

}]);

