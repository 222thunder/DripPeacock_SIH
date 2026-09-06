import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import inspectionRoutes from './routes/inspectionRoutes';

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);

// Database Connection & Server Start
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    console.warn('Starting server without MongoDB connection for local testing...');
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
