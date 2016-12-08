// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var todoListSchema = new Schema({
    name: {
        type: String,
        required: true
    },
	description: {
        type: String,
        required: false
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
var TodoLists = mongoose.model('List', todoListSchema);

// make this available to our Node applications
module.exports = TodoLists;