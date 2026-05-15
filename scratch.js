import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './BackEnd/.env' });
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ipt');
import Role from './BackEnd/models/Role.js';
const roles = await Role.find();
console.log(roles.map(r => r.name));
mongoose.connection.close();
