import { User } from "../user/user.model";
import { UserRole } from "../user/user.interface";
import { Event } from "../events/events.model";
import { Payment } from "../payment/payment.model";
import { PaymentStatus } from "../payment/payment.interface";
import { Booking } from "../booking/booking.model";
import { getSalesAggregationPipeline, processChartData } from "../../utils/stateAggreegation";
import { BookingStatus } from "../booking/booking.interface";

export const StatsService = {
// PLATFORM WIDE STATS (FOR SUPER ADMIN / ADMIN)
  getPlatformStats: async () => {
    const totalUsers = await User.countDocuments({
      isDeleted: false,
      role: { $ne: UserRole.USER },
    }); 
    const totalEvents = await Event.countDocuments({
      isDeleted: false,
      isActive: true,
    });
    const totalBookings = await Booking.countDocuments({ isDeleted: false });

    const revenueAgg = await Payment.aggregate([
      { $match: { status: PaymentStatus.PAID } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const ticketsSoldAgg = await Booking.aggregate([
      { $match: { status: BookingStatus.CONFIRMED } },
      { $group: { _id: null, totalTickets: { $sum: { $size: "$seats" } } } },
    ]);

    const monthlyAgg = await Booking.aggregate(getSalesAggregationPipeline());

    return {
      totalUsers,
      totalEvents,
      totalBookings,
      totalTicketsSold: ticketsSoldAgg[0]?.totalTickets || 0,
      totalRevenue: revenueAgg[0]?.totalRevenue || 0,
      monthlySalesData: processChartData(monthlyAgg),
    };
  },

  // HOST SPECIFIC STATS (FOR ORGANIZER DASHBOARD)
  getHostStats: async (hostId: string) => {
    const hostEvents = await Event.find({ organizer: hostId }).select("_id");
    const hostEventIds = hostEvents.map((event) => event._id);
    
    const totalEvents = hostEvents.length;
    
    const hostStatsAgg = await Booking.aggregate(getSalesAggregationPipeline({
        event: { $in: hostEventIds }, 
    }));

    
    const monthlyAgg = await Booking.aggregate(getSalesAggregationPipeline({
        event: { $in: hostEventIds },
    }));
    const totalRevenue = hostStatsAgg[0]?.totalRevenue || 0;
    const totalTicketsSold = hostStatsAgg[0]?.totalTickets || 0;
    const totalBookings = hostStatsAgg[0]?.totalBookings || 0;

    return {
      totalEvents,
      totalBookings,
      totalTicketsSold: totalTicketsSold,
      totalRevenue: totalRevenue,
      monthlySalesData: processChartData(monthlyAgg),
    };
  },
};
