import { Response } from "express";

interface TMeta {
  total: number;
  page: number;
  totalPages: number;
}

interface TMetaSeats {
  totalRows?: number;
  totalCols?: number;
  basePrice?: number;
}

interface TResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: TMeta | TMetaSeats;
}

export const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  res.status(data.statusCode).json({
    statusCode: data.statusCode,
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};
