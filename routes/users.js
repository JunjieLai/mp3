var User = require('../models/user');
var Task = require('../models/task');

module.exports = function (router) {

    // GET /api/users - Get all users with query parameters
    router.route('/users').get(function (req, res) {
        var query = User.find();

        // Handle 'where' parameter
        if (req.query.where) {
            try {
                var whereConditions = JSON.parse(req.query.where);
                query = query.where(whereConditions);
            } catch (e) {
                return res.status(400).json({
                    message: "Invalid where parameter. Must be valid JSON.",
                    data: {}
                });
            }
        }

        // Handle 'sort' parameter
        if (req.query.sort) {
            try {
                var sortConditions = JSON.parse(req.query.sort);
                query = query.sort(sortConditions);
            } catch (e) {
                return res.status(400).json({
                    message: "Invalid sort parameter. Must be valid JSON.",
                    data: {}
                });
            }
        }

        // Handle 'select' parameter
        if (req.query.select) {
            try {
                var selectConditions = JSON.parse(req.query.select);
                query = query.select(selectConditions);
            } catch (e) {
                return res.status(400).json({
                    message: "Invalid select parameter. Must be valid JSON.",
                    data: {}
                });
            }
        }

        // Handle 'skip' parameter
        if (req.query.skip) {
            query = query.skip(parseInt(req.query.skip));
        }

        // Handle 'limit' parameter
        if (req.query.limit) {
            query = query.limit(parseInt(req.query.limit));
        }

        // Handle 'count' parameter
        if (req.query.count === 'true') {
            query.countDocuments().exec(function (err, count) {
                if (err) {
                    return res.status(500).json({
                        message: "Error counting users.",
                        data: {}
                    });
                }
                return res.status(200).json({
                    message: "OK",
                    data: count
                });
            });
        } else {
            query.exec(function (err, users) {
                if (err) {
                    return res.status(500).json({
                        message: "Error retrieving users.",
                        data: {}
                    });
                }
                return res.status(200).json({
                    message: "OK",
                    data: users
                });
            });
        }
    });

    // POST /api/users - Create a new user
    router.route('/users').post(function (req, res) {
        // Validate required fields
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: "Name and email are required.",
                data: {}
            });
        }

        var user = new User();
        user.name = req.body.name;
        user.email = req.body.email;
        user.pendingTasks = req.body.pendingTasks || [];

        user.save(function (err, savedUser) {
            if (err) {
                // Check for duplicate email error
                if (err.code === 11000) {
                    return res.status(400).json({
                        message: "A user with this email already exists.",
                        data: {}
                    });
                }
                return res.status(500).json({
                    message: "Error creating user.",
                    data: {}
                });
            }
            return res.status(201).json({
                message: "User created successfully.",
                data: savedUser
            });
        });
    });

    // GET /api/users/:id - Get a specific user
    router.route('/users/:id').get(function (req, res) {
        var query = User.findById(req.params.id);

        // Handle 'select' parameter
        if (req.query.select) {
            try {
                var selectConditions = JSON.parse(req.query.select);
                query = query.select(selectConditions);
            } catch (e) {
                return res.status(400).json({
                    message: "Invalid select parameter. Must be valid JSON.",
                    data: {}
                });
            }
        }

        query.exec(function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: "Error retrieving user.",
                    data: {}
                });
            }
            if (!user) {
                return res.status(404).json({
                    message: "User not found.",
                    data: {}
                });
            }
            return res.status(200).json({
                message: "OK",
                data: user
            });
        });
    });

    // PUT /api/users/:id - Replace entire user
    router.route('/users/:id').put(function (req, res) {
        // Validate required fields
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: "Name and email are required.",
                data: {}
            });
        }

        User.findById(req.params.id, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: "Error finding user.",
                    data: {}
                });
            }
            if (!user) {
                return res.status(404).json({
                    message: "User not found.",
                    data: {}
                });
            }

            var oldPendingTasks = user.pendingTasks || [];
            var newPendingTasks = Array.isArray(req.body.pendingTasks) ? req.body.pendingTasks : [];

            // Update user fields
            user.name = req.body.name;
            user.email = req.body.email;
            user.pendingTasks = newPendingTasks;

            user.save(function (err, updatedUser) {
                if (err) {
                    if (err.code === 11000) {
                        return res.status(400).json({
                            message: "A user with this email already exists.",
                            data: {}
                        });
                    }
                    return res.status(500).json({
                        message: "Error updating user.",
                        data: {}
                    });
                }

                // Handle two-way reference for pendingTasks
                // Tasks removed from pendingTasks should be unassigned
                var removedTasks = oldPendingTasks.filter(function (taskId) {
                    return newPendingTasks.indexOf(taskId) === -1;
                });

                // Tasks added to pendingTasks should be assigned to this user
                var addedTasks = newPendingTasks.filter(function (taskId) {
                    return oldPendingTasks.indexOf(taskId) === -1;
                });

                // Unassign removed tasks
                if (removedTasks.length > 0) {
                    Task.updateMany(
                        { _id: { $in: removedTasks } },
                        { assignedUser: "", assignedUserName: "unassigned" },
                        function (err) {
                            if (err) {
                                console.error("Error unassigning tasks:", err);
                            }
                        }
                    );
                }

                // Assign added tasks
                if (addedTasks.length > 0) {
                    Task.updateMany(
                        { _id: { $in: addedTasks } },
                        { assignedUser: updatedUser._id.toString(), assignedUserName: updatedUser.name },
                        function (err) {
                            if (err) {
                                console.error("Error assigning tasks:", err);
                            }
                        }
                    );
                }

                return res.status(200).json({
                    message: "User updated successfully.",
                    data: updatedUser
                });
            });
        });
    });

    // DELETE /api/users/:id - Delete a user
    router.route('/users/:id').delete(function (req, res) {
        User.findById(req.params.id, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: "Error finding user.",
                    data: {}
                });
            }
            if (!user) {
                return res.status(404).json({
                    message: "User not found.",
                    data: {}
                });
            }

            var pendingTasks = user.pendingTasks || [];

            user.remove(function (err) {
                if (err) {
                    return res.status(500).json({
                        message: "Error deleting user.",
                        data: {}
                    });
                }

                // Unassign all tasks that were assigned to this user
                if (pendingTasks.length > 0) {
                    Task.updateMany(
                        { _id: { $in: pendingTasks } },
                        { assignedUser: "", assignedUserName: "unassigned" },
                        function (err) {
                            if (err) {
                                console.error("Error unassigning tasks:", err);
                            }
                        }
                    );
                }

                return res.status(200).json({
                    message: "User deleted successfully.",
                    data: user
                });
            });
        });
    });

    return router;
};
