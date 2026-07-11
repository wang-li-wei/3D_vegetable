import { Request, Response, NextFunction } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function success(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}

export function error(res: Response, message: string, status = 400) {
  res.status(status).json({ success: false, error: message });
}
