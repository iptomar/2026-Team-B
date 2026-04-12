import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  softDelete: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'role'
});

const Role = mongoose.model('Role', RoleSchema);

export default Role;
