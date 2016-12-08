// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var todoItemSchema = new Schema({
    title: {
        type: String,
        required: true
    },
	note: {
        type: String,
        required: false
    },
	dueDate: {
		// Only day without time information.
		type: Date,
		required: false
	},
	done: {
		type: Boolean,
		required: false
	},
	doneAt: {
		// Timestamp when the Todo item is done.
		type: Date,
		required: false
	},
	toDolist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List'
    },
	owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// the schema is useless so far
// we need to create a model using it
var TodoItems = mongoose.model('Items', todoItemSchema);

// make this available to our Node applications
module.exports = TodoItems;