import express from 'express';
import cors from 'cors';
import jobRoutes from './routes/jobs';
import userRoutes from './routes/users';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/jobs', jobRoutes);
app.use('/users', userRoutes);

export default app;
