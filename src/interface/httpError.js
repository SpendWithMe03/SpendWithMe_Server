export default class HttpError extends Error {
  // public readonly opts: ApiErrorInterface;

  constructor(opts) {
    super(opts.message);
    this.opts = opts;
    Error.captureStackTrace(this);
  }

  sendError(res) {
    return res.status(this.opts.code).json({
      title: this.opts.title,
      message: this.opts.message,
      code: this.opts.code,
      status: false,
    });
  }
}
