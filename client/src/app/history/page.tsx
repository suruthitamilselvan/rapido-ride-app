'use client';

import React, { useEffect, useState } from 'react';
import { fetchRideHistory } from '../../lib/api';
import { Ride } from '../../types';
import { jsPDF } from 'jspdf';
import { Download, Calendar, MapPin, Star, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export default function RideHistoryPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('rider-demo-01');

  useEffect(() => {
    const userId = localStorage.getItem('rapido_current_user_id') || 'rider-demo-01';
    setCurrentUserId(userId);

    fetchRideHistory(userId)
      .then((data) => setRides(data))
      .catch((err) => console.error('Error fetching ride history:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const downloadReceipt = (ride: Ride) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(149, 125, 173); // Pastel purple (#957DAD)
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('RAPIDO TAX INVOICE', 14, 20);

    // Invoice Meta
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Receipt #: RPD-${ride.id.substring(0, 8).toUpperCase()}`, 140, 15);
    doc.text(`Date: ${new Date(ride.createdAt).toLocaleDateString()}`, 140, 22);

    // Details
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Passenger: ${ride.rider?.name || 'Rahul Sharma'}`, 14, 45);
    doc.text(`Captain: ${ride.captain?.user?.name || 'Rapido Captain'}`, 14, 52);
    doc.text(`Vehicle: ${ride.captain?.vehicleModel || 'Vehicle'} (${ride.captain?.vehicleNumber || 'KA-XX'})`, 14, 59);
    doc.text(`Vehicle Type: ${ride.vehicleType.replace('_', ' ')}`, 14, 66);

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 73, 196, 73);

    doc.setFontSize(10);
    doc.text(`Pickup: ${ride.pickupAddress}`, 14, 82);
    doc.text(`Dropoff: ${ride.dropoffAddress}`, 14, 90);
    doc.text(`Distance: ${ride.distanceKm} km | Duration: ${ride.durationMin} mins`, 14, 98);

    doc.line(14, 105, 196, 105);

    // Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Item Description', 14, 115);
    doc.text('Amount (INR)', 155, 115);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Base Fare', 14, 125);
    doc.text(`Rs. ${ride.baseFare.toFixed(2)}`, 160, 125);

    doc.text(`Distance Fare (${ride.distanceKm} km)`, 14, 133);
    doc.text(`Rs. ${ride.distanceFare.toFixed(2)}`, 160, 133);

    doc.text('GST & Platform Taxes (5%)', 14, 141);
    doc.text(`Rs. ${ride.taxFare.toFixed(2)}`, 160, 141);

    if (ride.discountFare > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(`Discount Coupon (${ride.promoCode || 'PROMO'})`, 14, 149);
      doc.text(`- Rs. ${ride.discountFare.toFixed(2)}`, 158, 149);
      doc.setTextColor(30, 30, 30);
    }

    doc.line(14, 160, 196, 160);

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Paid', 14, 172);
    doc.text(`Rs. ${ride.totalFare.toFixed(2)}`, 155, 172);

    doc.save(`Rapido_Invoice_${ride.id.substring(0, 8)}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#2D283E] flex items-center space-x-2">
            <FileText className="w-6 h-6 text-[#957DAD]" />
            <span>My Rides & Receipts</span>
          </h1>
          <p className="text-xs text-[#6E6680] mt-1">
            View completed journeys and download GST tax invoices
          </p>
        </div>
        <span className="text-xs font-bold bg-[#EFEFEF] text-[#2D283E] px-3 py-1 rounded-full border border-[#D5D5D5]">
          {rides.length} Total Trips
        </span>
      </div>

      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-[#957DAD] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-[#6E6680] font-medium">Loading your ride history...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="bg-[#FDFDFD] rounded-3xl p-12 text-center border border-[#EFEFEF] shadow-sm space-y-3">
          <div className="text-4xl">🛵</div>
          <h3 className="font-bold text-base text-[#2D283E]">No rides yet</h3>
          <p className="text-xs text-[#6E6680] max-w-sm mx-auto">
            Ready to commute? Book your first Rapido Bike, Auto, or Cab ride to see your trip history and receipts here!
          </p>
          <a
            href="/"
            className="inline-block bg-[#957DAD] hover:bg-[#856D9D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-[#957DAD]/25 transition-all"
          >
            Book a Ride Now
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => {
            const dateStr = new Date(ride.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={ride.id}
                className="bg-[#FDFDFD] rounded-2xl p-5 border border-[#EFEFEF] shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl p-2 bg-[#EFEFEF] rounded-xl border border-[#E0E0E0]">
                      {ride.vehicleType === 'BIKE'
                        ? '🛵'
                        : ride.vehicleType === 'AUTO'
                        ? '🛺'
                        : '🚗'}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-[#2D283E]">
                        {ride.vehicleType.replace('_', ' ')}
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-[#6E6680] mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-[#957DAD]" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-[#2D283E]">₹{ride.totalFare}</div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        ride.status === 'COMPLETED'
                          ? 'bg-[#F1F5D8] text-[#415720] border border-[#DCE4B0]'
                          : ride.status === 'CANCELLED'
                          ? 'bg-[#FFD6A5]/40 text-[#784315] border border-[#FFD6A5]'
                          : 'bg-[#EFEFEF] text-[#2D283E] border border-[#D5D5D5]'
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-[#EFEFEF] p-3.5 rounded-xl border border-[#E0E0E0] space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7BA644] mt-0.5 flex-shrink-0" />
                    <span className="text-[#2D283E] font-medium truncate">{ride.pickupAddress}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#784315] mt-0.5 flex-shrink-0" />
                    <span className="text-[#2D283E] font-medium truncate">{ride.dropoffAddress}</span>
                  </div>
                </div>

                {/* Footer details & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-[#EFEFEF] text-xs">
                  <div className="text-[#6E6680]">
                    Captain: <strong className="text-[#2D283E]">{ride.captain?.user?.name || 'Assigned Driver'}</strong>
                    {ride.review && (
                      <span className="ml-2 inline-flex items-center text-[#784315] font-bold bg-[#FFD6A5]/40 px-1.5 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-[#FFD6A5] stroke-[#784315] mr-0.5" />
                        {ride.review.rating}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => downloadReceipt(ride)}
                    className="border border-[#D5D5D5] hover:border-[#957DAD] bg-[#FDFDFD] hover:bg-[#957DAD] hover:text-white text-[#2D283E] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Receipt</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
