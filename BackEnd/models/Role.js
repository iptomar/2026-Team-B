const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  }
}, {
  // Specify the exact collection name as requested
  collection: 'role'
});

const Role = mongoose.model('Role', RoleSchema);

module.exports = Role;
