var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require('request');
var Verify = require('./verify');

var ToDoLists = require('../models/todoLists');
var ToDoItems = require('../models/todoItems');

var todoListRouter = express.Router();
todoListRouter.use(bodyParser.json());
	
todoListRouter.route('/')

.get(Verify.verifyOrdinaryUser, function (req, res, next) {
	var userId = req.decoded._id;
	if (userId) {
		console.log("Get Todolists for user with id " + userId);	
	}
	ToDoLists.find({})
		.where( {"owner" : userId} )
		.populate('owner')
        .exec(function (err, listEntries) {
        if (err) throw err;
		
		// First put two virtual lists into resultlist
		var entries = [];
		var today = {
			"_id": 'today',
			"virtual": true,
			"name": 'Today',
			"description": 'All Todo items due today',
			"dueItems": 0				
		};
		entries.push(today);

	    var week = {
			"_id": 'week',
			"virtual": true,
			"name": 'Week',
			"description": 'All Todo items due this week',
			"dueItems": 0					
		};
		entries.push(week);
		
		// Add the selected lists into resultlist
		if (listEntries != null) {						   
			var len = listEntries.length;	
			for (i = 0; i < len; i++) {
				var entry = listEntries[i];
				var entry = {
					"_id":  entry._id,
					"virtual": false,
					"name": entry.name,
					"description": entry.description,
					"dueItems": 0,
					"owner": entry.owner
				}	
				entries.push(entry);								
			}
		} 
		
		console.log(entries.length + " todo lists found. Update them with dueItems counter.");
		
		// Get nr of Todo items for each list
		ToDoItems.find()
			.where( {"done" : false} )
			.where( {"owner" : userId} )
			.exec(function (err, todoItems) {		
			if (err) throw err;	
			
			console.log(todoItems.length + " todo items found.");
			var refDateToday = new Date();
    		refDateToday.setHours(23, 59, 59);
			
			var refDateWeek = new Date();
			refDateWeek.setHours(23, 59, 59);	
			refDateWeek.setDate(refDateWeek.getDate() + 6);	
			
			var itemsLen = todoItems.length;	
			for (i = 0; i < itemsLen; i++) {
				var item = todoItems[i];
				var itemListIdString = "" + item.toDolist;
				
				// Inc dueItems counter on appropriate lists
				for (y = 0; y < entries.length; y++) {
					var currentListEntry = entries[y];
					
					var currentEntryIdString = "" + currentListEntry._id
					if (currentEntryIdString == itemListIdString) {
						// Item belongs to this list. 
						currentListEntry.dueItems = currentListEntry.dueItems + 1;
					} 
					
					// Check today list and week list
					if (item.dueDate != null) {
						if (currentEntryIdString == "today") {
							if (item.dueDate <= refDateToday) {
								currentListEntry.dueItems = currentListEntry.dueItems + 1;	
							}	
						} else if (currentEntryIdString == "week") {
							if (item.dueDate <= refDateWeek) {
								currentListEntry.dueItems = currentListEntry.dueItems + 1;	
							}
						} 
					}
				}								
			}
			
			res.json(entries); 
		});		
    });
})

.post(Verify.verifyOrdinaryUser, function (req, res, next) {
	// attribute owner is filled with the id of the logged in user.
    req.body.owner = req.decoded._id;
	ToDoLists.create(req.body, function (err, listEntry) {
        if (err) throw err;
        var id = listEntry._id;
		var ownerId = listEntry.owner
		console.log('List entry created with id ' + id + '. Owner is ' + ownerId);
        res.json(listEntry);
    });
})

.delete(Verify.verifyOrdinaryUser, function (req, res, next) {
	ToDoLists.remove({}, function (err, resp) {
        if (err) throw err;
        res.json(resp);
    });
});

todoListRouter.route('/:listEntryId')
	
.get(Verify.verifyOrdinaryUser, function(req,res,next){
    if (req.params.listEntryId == 'today') {
		var today = {
			"_id": 'today',
			"virtual": true,
			"name": 'Today',
			"description": 'All Todo items due today',
			"dueItems": 12				
		};
		res.json(today);
	} else if (req.params.listEntryId == 'week') {
		 var week = {
			"_id": 'week',
			"virtual": true,
			"name": 'Week',
			"description": 'All Todo items due this week',
			"dueItems": 11					
		};
		res.json(week);
	} else {
		ToDoLists.findById(req.params.listEntryId)
			.exec(function (err, listEntry) {
			if (err) throw err;
			res.json(listEntry);			
		});
	}
})

.put(Verify.verifyOrdinaryUser, function(req, res, next){
	console.log('Updating list entry with id ' + req.params.listEntryId + ' ...');
    ToDoLists.findByIdAndUpdate(req.params.listEntryId, {
        $set: req.body
    }, {
        new: true
    }, function (err, listEntryId) {
        if (err) throw err;
        res.json(listEntryId);
    });
})

// Deletes the Todo list entry with all referenced Todo items.
.delete(Verify.verifyOrdinaryUser, function(req, res, next){
	console.log('Deleting list entry with id ' + req.params.listEntryId + ' ...');
	
	var query = ToDoItems.find().remove( {toDolist : req.params.listEntryId} )
	query.remove(function (err, itemRemoveResponse) {        
		if (err) throw err;
		console.log('Deleted TodoItems. Delete list entry ...');
		
		ToDoLists.findByIdAndRemove(req.params.listEntryId, function (err, listRemoveResponse) {        
			if (err) throw err;
			console.log('Deleted list entry');
        	res.json(listRemoveResponse);
    	});
    });
});

// Access Todo items of a specific Todo list
// :id/todoitems
todoListRouter.route('/:listEntryId/todoItems')

.get(Verify.verifyOrdinaryUser, function(req,res,next){
	var userId = req.decoded._id;
	console.log('Getting todo items for list ' + req.params.listEntryId + ' for user with id ' + userId);	
    if (req.params.listEntryId == 'today') {
		// Select todo items which are due until today and not done
		var refDate = new Date();
    	refDate.setHours(23, 59, 59);
		ToDoItems.find()
			.where( {"dueDate" : {"$lte" : refDate}} )
			.where( {"done" : false} )
			.where( {"owner" : userId} )
			.limit(50)
			.sort({"dueDate" : 1} )
			.exec(function (err, todoItems) {		
			if (err) throw err;
			res.json(todoItems);
		});	
	} else if (req.params.listEntryId == 'week') {
		// Select todo items which are due within a week or before and not done
		var refDate = new Date();
		refDate.setHours(23, 59, 59);	
		refDate.setDate(refDate.getDate() + 6);	
		ToDoItems.find()
			.where( {"dueDate" : {"$lte" : refDate}} )
			.where( {"done" : false} )
			.where( {"owner" : userId} )
			.limit(50)
			.sort({"dueDate" : 1} )
			.exec(function (err, todoItems) {		
			if (err) throw err;
			res.json(todoItems);		
		});	
	} else {
		// Select todo items of the given list. Regardless whether done or not.
		ToDoItems.find( {toDolist : req.params.listEntryId} )
			.exec(function (err, todoItems) {		
			if (err) throw err;
			res.json(todoItems);
		});
	}
});

// Count Todo items of a specific Todo list
// :id/countItems
todoListRouter.route('/:listEntryId/countItems')

.get(Verify.verifyOrdinaryUser, function(req,res,next){
    console.log('Getting # open items for list ' + req.params.listEntryId);
    if (req.params.listEntryId == 'today') {
		// Select nr of todo items which are due until today and not done
		var refDate = new Date();
    	refDate.setHours(23, 59, 59);
		ToDoItems
			.where( {"dueDate" : {"$lte" : refDate}} )
			.where( {"done" : false} )
			.count(function (err, count) {		
			if (err) throw err;
			res.json(count);
		});	
	} else if (req.params.listEntryId == 'week') {
		// Select nr of todo items which are due within a week or before and not done
		var refDate = new Date();
		refDate.setHours(23, 59, 59);	
		refDate.setDate(refDate.getDate() + 6);	
		ToDoItems
			.where( {"dueDate" : {"$lte" : refDate}} )
			.where( {"done" : false} )
			.count(function (err, count) {		
			if (err) throw err;
			res.json(count);		
		});	
	} else {
		// Select nr of todo items of the given list. Regardless whether done or not.
		ToDoItems
			.where( {"toDolist" : req.params.listEntryId} )
			.count(function (err, count) {		
			if (err) throw err;
			res.json(count);		
		});	
	} 	
});

module.exports = todoListRouter
