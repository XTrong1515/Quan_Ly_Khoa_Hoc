const app = require('./src/app');
const { startExpireOrdersJob } = require('./src/jobs/expireOrders');
const hls = require('./src/services/video/hls');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[hoisted-api] http://localhost:${PORT}`);
  startExpireOrdersJob();
  hls.resumePending().catch((err) => console.error('[hls] resume', err.message));
});
