const app = require('./src/app');
const { startExpireOrdersJob } = require('./src/jobs/expireOrders');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[hoisted-api] http://localhost:${PORT}`);
  startExpireOrdersJob();
});
