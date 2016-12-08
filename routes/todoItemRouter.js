var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require('request');
var Verify = require('./verify');

var ToDoItems = require('../models/todoItems');

var todoItemRouter = express.Router();
todoItemRouter.use(bodyParser.json());
	
// General access of Todo items
todoItemRouter.route('/')

.get(Verify.verifyOrdinaryUser, function (req, res, next) {
	ToDoItems.find({})
        .exec(function (err, listItems) {
        if (err) throw err;
        res.json(listItems);
    });
})

.post(Verify.verifyOrdinaryUser, function (req, res, next) {
	// attribute owner is filled with the id of the logged in user.
    req.body.owner = req.decoded._id;
	ToDoItems.create(req.body, function (err, listEntry) {
        if (err) throw err;
        var id = listEntry._id;
		var ownerId = listEntry.owner
		console.log('Todo item created with id ' + id + '. Owner is ' + ownerId);
        res.json(listEntry);
    });
})

// Access a single Todo item by ID
todoItemRouter.route('/:toDoItemId')
	
.get(Verify.verifyOrdinaryUser, function(req,res,next){
    ToDoItems.findById(req.params.toDoItemId)
        .exec(function (err, listEntry) {
        if (err) throw err;
        res.json(listEntry);
    });
})

.put(Verify.verifyOrdinaryUser, function(req, res, next){
	console.log('Updating todo item with id ' + req.params.toDoItemId + ', ' + JSON.stringify(req.body));
    ToDoItems.findByIdAndUpdate(req.params.toDoItemId, {
        $set: req.body
    }, {
        new: true
    }, function (err, listEntryId) {
        if (err) throw err;
        res.json(listEntryId);
    });
})

.delete(Verify.verifyOrdinaryUser, function(req, res, next){
    ToDoItems.findByIdAndRemove(req.params.toDoItemId, function (err, resp) {        
		if (err) throw err;
        res.json(resp);
    });
})


module.exports = todoItemRouter
