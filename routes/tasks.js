var Task = require('../models/task');
var User = require('../models/user');

module.exports = function (router) {

    // GET /api/tasks - Get all tasks with query parameters
    router.route('/tasks').get(function (req, res) {
        var query = Task.find();

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

        // Handle 'limit' parameter - default to 100 for tasks
        var limit = req.query.limit ? parseInt(req.query.limit) : 100;
        query = query.limit(limit);

        // Handle 'count' parameter
        if (req.query.count === 'true') {
            // For count, we need to get the count without limit
            var countQuery = Task.find();
            if (req.query.where) {
                try {
                    var whereConditions = JSON.parse(req.query.where);
                    countQuery = countQuery.where(whereConditions);
                } catch (e) {
                    return res.status(400).json({
                        message: "Invalid where parameter. Must be valid JSON.",
                        data: {}
                    });
                }
            }
            countQuery.countDocuments().exec(function (err, count) {
                if (err) {
                    return res.status(500).json({
                        message: "Error counting tasks.",
                        data: {}
                    });
                }
                return res.status(200).json({
                    message: "OK",
                    data: count
                });
            });
        } else {
            query.exec(function (err, tasks) {
                if (err) {
                    return res.status(500).json({
                        message: "Error retrieving tasks.",
                        data: {}
                    });
                }
                return res.status(200).json({
                    message: "OK",
                    data: tasks
                });
            });
        }
    });

    // POST /api/tasks - Create a new task
    router.route('/tasks').post(function (req, res) {
        // Validate required fields
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: "Name and deadline are required.",
                data: {}
            });
        }

        var task = new Task();
        task.name = req.body.name;
        task.description = req.body.description || "";
        task.deadline = req.body.deadline;
        task.completed = req.body.completed || false;
        task.assignedUser = req.body.assignedUser || "";
        task.assignedUserName = req.body.assignedUserName || "unassigned";

        task.save(function (err, savedTask) {
            if (err) {
                return res.status(500).json({
                    message: "Error creating task.",
                    data: {}
                });
            }

            // If task is assigned to a user, update user's pendingTasks
            if (savedTask.assignedUser && savedTask.assignedUser !== "") {
                User.findById(savedTask.assignedUser, function (err, user) {
                    if (!err && user) {
                        if (user.pendingTasks.indexOf(savedTask._id.toString()) === -1) {
                            user.pendingTasks.push(savedTask._id.toString());
                            user.save(function (err) {
                                if (err) {
                                    console.error("Error updating user's pendingTasks:", err);
                                }
                            });
                        }
                    }
                });
            }

            return res.status(201).json({
                message: "Task created successfully.",
                data: savedTask
            });
        });
    });

    // GET /api/tasks/:id - Get a specific task
    router.route('/tasks/:id').get(function (req, res) {
        var query = Task.findById(req.params.id);

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

        query.exec(function (err, task) {
            if (err) {
                return res.status(500).json({
                    message: "Error retrieving task.",
                    data: {}
                });
            }
            if (!task) {
                return res.status(404).json({
                    message: "Task not found.",
                    data: {}
                });
            }
            return res.status(200).json({
                message: "OK",
                data: task
            });
        });
    });

    // PUT /api/tasks/:id - Replace entire task
    router.route('/tasks/:id').put(function (req, res) {
        // Validate required fields
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: "Name and deadline are required.",
                data: {}
            });
        }

        Task.findById(req.params.id, function (err, task) {
            if (err) {
                return res.status(500).json({
                    message: "Error finding task.",
                    data: {}
                });
            }
            if (!task) {
                return res.status(404).json({
                    message: "Task not found.",
                    data: {}
                });
            }

            var oldAssignedUser = task.assignedUser;
            var newAssignedUser = req.body.assignedUser || "";

            // Update task fields
            task.name = req.body.name;
            task.description = req.body.description || "";
            task.deadline = req.body.deadline;
            task.completed = req.body.completed !== undefined ? req.body.completed : false;
            task.assignedUser = newAssignedUser;
            task.assignedUserName = req.body.assignedUserName || "unassigned";

            task.save(function (err, updatedTask) {
                if (err) {
                    return res.status(500).json({
                        message: "Error updating task.",
                        data: {}
                    });
                }

                // Handle two-way reference for assignedUser
                var taskId = updatedTask._id.toString();

                // Remove task from old user's pendingTasks
                if (oldAssignedUser && oldAssignedUser !== "" && oldAssignedUser !== newAssignedUser) {
                    User.findById(oldAssignedUser, function (err, user) {
                        if (!err && user) {
                            var index = user.pendingTasks.indexOf(taskId);
                            if (index > -1) {
                                user.pendingTasks.splice(index, 1);
                                user.save(function (err) {
                                    if (err) {
                                        console.error("Error removing task from old user:", err);
                                    }
                                });
                            }
                        }
                    });
                }

                // Add task to new user's pendingTasks
                if (newAssignedUser && newAssignedUser !== "" && oldAssignedUser !== newAssignedUser) {
                    User.findById(newAssignedUser, function (err, user) {
                        if (!err && user) {
                            if (user.pendingTasks.indexOf(taskId) === -1) {
                                user.pendingTasks.push(taskId);
                                user.save(function (err) {
                                    if (err) {
                                        console.error("Error adding task to new user:", err);
                                    }
                                });
                            }
                        }
                    });
                }

                return res.status(200).json({
                    message: "Task updated successfully.",
                    data: updatedTask
                });
            });
        });
    });

    // DELETE /api/tasks/:id - Delete a task
    router.route('/tasks/:id').delete(function (req, res) {
        Task.findById(req.params.id, function (err, task) {
            if (err) {
                return res.status(500).json({
                    message: "Error finding task.",
                    data: {}
                });
            }
            if (!task) {
                return res.status(404).json({
                    message: "Task not found.",
                    data: {}
                });
            }

            var assignedUser = task.assignedUser;
            var taskId = task._id.toString();

            task.remove(function (err) {
                if (err) {
                    return res.status(500).json({
                        message: "Error deleting task.",
                        data: {}
                    });
                }

                // Remove task from user's pendingTasks if it was assigned
                if (assignedUser && assignedUser !== "") {
                    User.findById(assignedUser, function (err, user) {
                        if (!err && user) {
                            var index = user.pendingTasks.indexOf(taskId);
                            if (index > -1) {
                                user.pendingTasks.splice(index, 1);
                                user.save(function (err) {
                                    if (err) {
                                        console.error("Error removing task from user:", err);
                                    }
                                });
                            }
                        }
                    });
                }

                return res.status(200).json({
                    message: "Task deleted successfully.",
                    data: task
                });
            });
        });
    });

    return router;
};
