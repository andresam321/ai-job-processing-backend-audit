import app from './app';
import { startJobProcessor } from './workers/jobProcessor';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`[server] Backend running at http://localhost:${PORT}`);
  startJobProcessor();
  console.log('[server] Job processor started');
});
