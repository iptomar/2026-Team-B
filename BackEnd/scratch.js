import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import Role from './models/Role.js';
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const roles = await Role.find();
  console.log(roles.map(r => r.name));
  mongoose.connection.close();
})();
