/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaymentStatus } from "../modules/payment/payment.interface";

export const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const processChartData = (data: any[]) => {
    return data.map(item => ({
        name: monthNames[item._id - 1],
        Revenue: parseFloat(item.totalRevenue.toFixed(2)),
        Tickets: item.totalTickets
    }));
};



export const getSalesAggregationPipeline = (filter: any = {}) => {
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    return [
        { 
            $match: { 
                createdAt: { $gte: sixMonthsAgo },
                ...filter 
            } 
        },
        {
            $lookup: {
                from: 'payments',
                localField: 'payment',
                foreignField: '_id',
                as: 'paymentDetails'
            }
        },
        { $unwind: '$paymentDetails' },
        
        {
            $match: {
                'paymentDetails.status': PaymentStatus.PAID 
            }
        },
        { 
            $group: { 
                _id: { $month: "$createdAt" }, 
                totalRevenue: { $sum: "$paymentDetails.amount" }, 
                totalTickets: { $sum: { $size: "$seats" } }
            } 
        },
        { $sort: { _id: 1 as const } } 
    ];
};