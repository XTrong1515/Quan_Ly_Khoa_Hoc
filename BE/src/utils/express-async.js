/**
 * Express 4 không bắt lỗi của handler async: promise bị reject → unhandledRejection → Node tắt cả tiến trình,
 * nên chỉ một request dị dạng cũng làm sập API. Vá Layer để mọi route / middleware chuyển lỗi tới error middleware
 * (Express 5 đã làm sẵn việc này; khi nâng cấp thì xóa file này).
 */
const Layer = require('express/lib/router/layer');

Layer.prototype.handle_request = function handleRequest(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // error middleware (4 tham số) đi qua nhánh handle_error
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (err) {
    next(err);
  }
  return undefined;
};
