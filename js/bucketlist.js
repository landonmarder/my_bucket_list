$(function() {
        var appUser;

        var client = new Apigee.Client({
            orgName: 'landonmarder', // Your Apigee.com username for App Services
            appName: 'sandbox' // Your Apigee App Services app name
        });

        var items = new Apigee.Collection({
            "client": client,
            "type": "items",
            "qs": {
                "limit": 100,
                "ql": "order by title"
            }
        });

        var myList = new Apigee.Collection({
            "client": client,
            "type": "users/me/myitems",
            "qs": {
                "limit": 25,
                "ql": "order by title"
            }
        })

        client.getLoggedInUser(function(err, data, user) {
            if (err) {
                //error - could not get logged in user
                window.location = "#page-login";
            } else {
                if (client.isLoggedIn()) {
                    appUser = user;
                    loadItems(myList);
                }
            }
        });

        $('#form-add-user').on('click', '#btn-submit', createUser);
        $('#form-login-user').on('click', '#btn-submit', login);
        $('#header-mylist').on('click', '#btn-logout', function() {
            client.logout();
            $('#form-login-user #btn-submit').removeClass('hideaway');
        });

        function createUser() {
            var fullname = $("#form-new-fullname").val();
            var username = $("#form-new-username").val();
            var password = $("#form-new-password").val();
            var email = $("#form-new-email").val();
            client.signup(username, password, email, fullname, function(err, data) {
                if (err) {
                    console.log('FAIL')
                } else {
                    console.log('SUCCESS');
                    login(username, password);
                    $("#form-new-username").val('');
                    $("#form-new-password").val('');
                    $("#form-new-password").val('');
                    $("#form-new-email").val('');
                }
            });
        }

        function login(username, password) {
            $('#login-section-error').html('');

            if (username && password) {
                var username = username;
                var password = password;
            } else {
                var username = $("#form-username").val();
                var password = $("#form-password").val();
            }

            client.login(username, password,
                function(err) {
                    if (err) {
                        $('#login-section-error').html('There was an error logging you in.');
                        console.log(err)
                    } else {
                        //login succeeded
                        client.getLoggedInUser(function(err, data, user) {
                            if (err) {
                                //error - could not get logged in user
                            } else {
                                if (client.isLoggedIn()) {
                                    appUser = user;
                                }
                            }
                        });

                        //clear out the login form so it is empty if the user chooses to log out
                        $("#form-username").val('');
                        $("#form-password").val('');

                        window.location = "#page-main";
                        loadItems(myList);
                    }
                }
            );
        }

        navigator.geolocation.getCurrentPosition(geoSuccess, geoFailure);

        function geoSuccess(e) {
            console.log(e)
            my_location = e.coords;
            console.log("lat: " + my_location.latitude);
            console.log("lon: " + my_location.longitude);
            items = new Apigee.Collection({
                "client": client,
                "type": "items",
                "qs": {
                    "limit": 100,
                    "ql": "location within 1500000 of " + my_location.latitude + "," + my_location.longitude
                }
            });
            // loadItems(); <-- loadItems now called after login
        }

        function geoFailure() {
            alert("Unable to access your geolocation");

            // The following is just for testing locally in Chrome
            // that doesn't support geolocation from a file:// address
            // my_location = {
            //     "latitude": "35.123456",
            //     "longitude": "-120.987654"
            // }
            // items = new Apigee.Collection({
            //     "client": client,
            //     "type": "items",
            //     "qs": {
            //         "limit": 100,
            //         "ql": "location within 1500000 of " + my_location.latitude + "," + my_location.longitude
            //     }
            // });
            // loadItems();  <-- loadItems now called after login
        }

        function populateList(collection) {
            $('#bucketlist').empty();
            while (collection.hasNextEntity()) {
                var item = collection.getNextEntity();
                $('#bucketlist').append('<li><a href="#page-add" data-uuid=' + item.get('uuid') + '><h3>' + item.get('title') + '</h3></a></li>');
                var lookup = item.get('completedby');
                if ((lookup) && (lookup.indexOf(appUser.get('uuid')) > -1)) {
                    $('#bucketlist li:last').addClass('done');
                }
            }
            $('.masterList li').attr('data-icon', 'expand-alt');
            $('.masterList li.done').addClass('hideaway');
            $('#bucketlist').listview('refresh');
        }

        // loadItems();

        function loadItems(collection) {
            collection.fetch(
                function(err, data) { // Success
                    if (err) {
                        alert("Read failed - loading offline data");
                        collection = client.restoreCollection(localStorage.getItem(collection));
                        collection.resetEntityPointer();
                        populateList(collection);
                    } else {
                        populateList(collection);
                        localStorage.setItem(collection, collection.serialize());
                    }
                }
            );
        }

        $('#form-add-item').on('click', '#btn-submit', function() {
            if ($('#form-title').val() !== '') {
                var newItem = {
                    'title': $('#form-title').val(),
                    'desc': $('#form-desc').val()
                }
                items.addEntity(newItem, function(error, response) {
                    if (error) {
                        alert("write failed");
                    } else {
                        var options = {
                            "type": "items",
                            "uuid": response._data.uuid
                        }
                        client.getEntity(options, function(error, response) {
                            appUser.connect("myitems", response, function(error, data) {
                                if (error) {
                                    alert("error!");
                                } else {
                                    $('#form-title').val('');
                                    $('#form-desc').val('');
                                    $('#btn-load-mylist').trigger('click');
                                    window.location = "#page-main";
                                }
                            });
                        });
                    }
                });
            }
        });

        $('form').on('click', '#btn-clear', function() {
            $('input').val('');
        });

        $('#bucketlist').on('click', 'a', function(e) {
            if ($('#bucketlist').hasClass('masterList')) {
                var options = {
                    "type": "items",
                    "uuid": $(this).attr('data-uuid')
                }
                client.getEntity(options, function(error, response) {
                    appUser.connect("myitems", response, function(error, data) {
                        if (error) {
                            alert("error!");
                        } else {
                            loadItems(myList);
                            $('.masterList').removeClass('masterList');
                        }
                    });
                });
                e.preventDefault();
            } else {
                var options = {
                    "type": "items",
                    "uuid": $(this).attr('data-uuid')
                };
                client.getEntity(options, function(error, response) {
                    var title = response.get('title');
                    var desc = response.get('desc');
                    var completedby = response.get('completedby');
                    $('#form-title').val(title);
                    $('#form-desc').val(desc);
                    $('#form-uuid').val(options.uuid);
                    $('#form-completedby').val(completedby);
                });
                $('#btn-submit, #btn-cancel').addClass('hideaway');
                $('#btn-did-it, #btn-forget-it').removeClass('hideaway');
            }
        });
        $('#header-mylist').on('click', '#btn-new', function() {
            $('#btn-submit, #btn-cancel').removeClass('hideaway');
            $('#btn-did-it, #btn-forget-it').addClass('hideaway');
            $('#form-title').val('');
            $('#form-desc').val('');
        });
        $('#form-add-item').on('click', '#btn-did-it', function() {
            var uuid = $('#form-uuid').val();
            var completedby = ($('#form-completedby').val()).split(',');
            completedby.push(appUser.get('uuid'));
            var options = {
                "client": client,
                "data": {
                    'type': 'items',
                    'uuid': uuid,
                    'completedby': completedby
                }
            };
            var entry = new Apigee.Entity(options);
            entry.save(function(error, response) {
                if (error) {
                    alert('could not write to the database')
                } else {
                    $('#btn-load-mylist').trigger('click');
                }
            });
        });
        $("#form-add-item").on('click', '#btn-forget-it', function() {
            var uuid = $('#form-uuid').val();
            var options = {
                "endpoint": "/users/me/myitems/" + uuid,
                "method": "DELETE"
            }
            client.request(options, function(err, response) {
                if (err) {
                    alert("Unable to delete item");
                } else {
                    $('#btn-load-mylist').trigger('click');
                }
            });
        });

        $('#app-nav').on('click', '#btn-load-inspiration', function() {
            loadItems(items);
            $('#bucketlist').addClass('masterList');
        });
        $('#app-nav').on('click', '#btn-load-mylist', function() {
            loadItems(myList);
            $('.masterList').removeClass('masterList');
        });
    });
