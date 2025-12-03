import PDFDocument from "pdfkit";
import { AppError } from "../errorHelpers/AppError";

export interface IInvoice {
  transactionId: string;
  bookingDate: string;
  tourTitle: string;
  guestCount: number;
  totalAmount: number;
  cusName: string;
  cusEmail: string;
  cusPhone: string;
  cusAddress: string;
  invoiceNumber: number
}


export const generatePDF = async (
  invoiceData: IInvoice
): Promise<Buffer<ArrayBufferLike>> => {
  try {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers: Uint8Array[] = [];


      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // === Company Info ===
      doc.fontSize(10).text("Bangladesh", 400, 40);
      doc.text("985476325", 400, 55);
      doc.text("phtourmanagement.com", 400, 70);

      doc.moveTo(50, 90).lineTo(550, 90).stroke();

      // === Invoice & Customer Info ===
      doc.fontSize(12).text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 105);
      doc.text(`Date: ${invoiceData.bookingDate}`, 50, 125);

      doc.text(`Customer Name: ${invoiceData.cusName}`, 300, 105);
      doc.text(`Customer Email: ${invoiceData.cusEmail}`, 300, 125);
      doc.text(`Address: ${invoiceData.cusAddress}`, 300, 145);
      doc.text(`Phone: ${invoiceData.cusPhone}`, 300, 165);

      // === Table Header ===
      doc.moveDown();
      const startY = 200;
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Particular", 50, startY);
      doc.text("Price", 250, startY);
      doc.text("Trip Pax", 350, startY);
      doc.text("Trip Amount", 450, startY);
      doc
        .moveTo(50, startY + 15)
        .lineTo(550, startY + 15)
        .stroke();

      // === Single Row (From Your invoiceData) ===
      const pricePerGuest = invoiceData.totalAmount / invoiceData.guestCount;

      doc.font("Helvetica");
      const rowY = startY + 30;
      doc.text(invoiceData.tourTitle, 50, rowY);
      doc.text(`$${pricePerGuest.toFixed(2)} / person`, 250, rowY);
      doc.text(`${invoiceData.guestCount}`, 370, rowY);
      doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, 450, rowY);

      // === Total Amount Summary ===
      const totalY = rowY + 50;
      doc.font("Helvetica-Bold").text("Total Amount", 350, totalY);
      doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, 450, totalY);

      // === Payment Details ===
      const paymentY = totalY + 80;
      doc.fontSize(13).text("Payment Details", 50, paymentY);

      doc.fontSize(11).font("Helvetica-Bold");
      const tableY = paymentY + 25;
      doc.text("Date", 50, tableY);
      doc.text("Payment Id / Txn Id", 250, tableY);
      // doc.text("Payment Method", 300, tableY);
      doc.text("Payment Amount", 450, tableY);
      doc
        .moveTo(50, tableY + 15)
        .lineTo(550, tableY + 15)
        .stroke();

      doc.font("Helvetica");
      doc.text(invoiceData.bookingDate, 50, tableY + 30);
      doc.text(invoiceData.transactionId, 250, tableY + 30);
      doc.text(`$${invoiceData.totalAmount.toFixed(2)}`, 450, tableY + 30);

      // === Footer Message ===
      doc
        .moveDown()
        .fontSize(12)
        .text("Thank you for your booking!", 200, tableY + 80);

      doc.end();
    });
  } catch {
    // console.error(error);
    throw new AppError(400, "PDF generation error");
  }
};