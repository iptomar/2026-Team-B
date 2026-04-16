import mongoose from 'mongoose';

const connectDB = async () => {
	try {
		// Placeholder connection string - should use process.env.MONGO_URI in production
		const conn = await mongoose.connect(process.env.MONGO_URI, {
			// NOTE: Current Mongoose versions don't require useNewUrlParser and useUnifiedTopology
		});

		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
};

export default connectDB;
