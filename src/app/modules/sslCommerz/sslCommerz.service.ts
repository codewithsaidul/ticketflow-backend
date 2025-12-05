import { StatusCodes } from "http-status-codes";
import { envVars } from "../../config/env";
import { AppError } from "../../errorHelpers/AppError";
import { ISSLCommerz } from "./sslCommerz.interface";
import axios from "axios";

export const SSLServices = {
  sslPaymentInit: async (payload: ISSLCommerz) => {
    try {
      const data = {
        store_id: envVars.SSL.SSL_STORE_ID,
        store_passwd: envVars.SSL.SSL_STORE_PASS,
        total_amount: payload.amount,
        currency: "BDT",
        tran_id: payload.transactionId,
        success_url: `${envVars.SSL.SSL_SUCCESS_BACKEND_URL}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=success`,
        fail_url: `${envVars.SSL.SSL_FAIL_BACKEND_URL}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=fail`,
        cancel_url: `${envVars.SSL.SSL_CANCEL_BACKEND_URL}?transactionId=${payload.transactionId}&amount=${payload.amount}&status=cancel`,
        emi_option: "N/A",
        product_name: "N/A",
        product_category: "N/A",
        product_profile: "N/A",
        cus_name: payload.name,
        cus_email: payload.email,
        cus_add1: payload.address,
        cus_add2: "N/A",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "3100",
        cus_country: "Bangladesh",
        cus_phone: payload.phoneNumber,
        cus_fax: "N/A",
        shipping_method: "N/A",
        ship_name: "N/A",
        ship_add1: "N/A",
        ship_add2: "N/A",
        ship_city: "N/A",
        ship_state: "N/A",
        ship_postcode: 1000,
        ship_country: "N/A",
      };

      const res = await axios({
        method: "POST",
        url: envVars.SSL.SSL_PAYMENT_API,
        data: data,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (res.data?.status === "FAILED") {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "SSLCommerz Initialization Failed"
        );
      }

      return res.data;
    } catch (error) {
      console.error("Payment Error:", error);
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Payment initiation failed"
      );
    }
  },
};
