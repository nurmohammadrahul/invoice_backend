import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // First try: MongoDB Atlas
    console.log('🔗 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    return conn;
  } catch (atlasError) {
    console.error('❌ MongoDB Atlas connection failed:', atlasError.message);
    
    // Second try: Local MongoDB
    console.log('🔗 Attempting to connect to local MongoDB...');
    try {
      const localConn = await mongoose.connect('mongodb://localhost:27017/invoice_system', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ Local MongoDB connected successfully!');
      return localConn;
    } catch (localError) {
      console.error('❌ Local MongoDB connection also failed:', localError.message);
      
      // Final fallback: In-memory storage
      console.log('💡 Using in-memory storage mode');
      return null;
    }
  }
};

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔗 MongoDB reconnected');
});

export default connectDB;