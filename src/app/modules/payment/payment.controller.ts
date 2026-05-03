/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { PaymentServices } from "./payment.service";
import { envVars } from "../../config/env";
import { sendResponse } from "../../utils/sendResponse";
import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

export const PaymentController = {
  initPayment: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const bookingId = req.params.bookingId;

      const result = await PaymentServices.initPayment(bookingId as string);

      sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Payment Done successfully",
        data: result.paymentUrl.GatewayPageURL,
      });
    }
  ),

  successPayment: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query;
      const result = await PaymentServices.successPayment(
        query as Record<string, string>
      );

      if (result.success) {
        res.redirect(
          `${envVars.SSL.SSL_SUCCESS_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`
        );
      }
    }
  ),

  failPayment: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query;
      const result = await PaymentServices.failPayment(
        query as Record<string, string>
      );

      if (!result.success) {
        res.redirect(
          `${envVars.SSL.SSL_FAIL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`
        );
      }
    }
  ),

  cancelPayment: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query;
      const result = await PaymentServices.cancelPayment(
        query as Record<string, string>
      );

      if (!result.success) {
        res.redirect(
          `${envVars.SSL.SSL_CANCEL_FRONTEND_URL}?transactionId=${query.transactionId}&message=${result.message}&amount=${query.amount}&status=${query.status}`
        );
      }
    }
  ),

  getInvoiceDownloadUrl: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { paymentId } = req.params;
      const decodedToken = req.user as JwtPayload;
      const result = await PaymentServices.getInvoiceDownloadUrl(
        paymentId as string,
        decodedToken._id
      );
      sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Invoice download url retrive successfully!",
        data: result,
      });
    }
  ),
};
