'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { Ride } from '../types';
import { processPayment, submitReview } from '../lib/api';
import { CheckCircle2, Star, Download, CreditCard, DollarSign, HeartHandshake } from 'lucide-react';

interface PaymentModalProps {
  ride: Ride;
  onClose: () => void;
}

export default function PaymentModal({ ride, onClose }: PaymentModalProps) {
  const [tip, setTip] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'UPI' | 'CASH'>('STRIPE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(ride.paymentStatus === 'PAID');
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    // Trigger celebration confetti upon trip completion
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const totalPayable = ride.totalFare + tip;

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await processPayment({
        rideId: ride.id,
        paymentMethod,
        tipAmount: tip,
      });
      setIsPaid(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 },
        });
      } catch (e) {}
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!ride.captainId) return;
    setIsSubmittingReview(true);
    try {
      await submitReview({
        rideId: ride.id,
        riderId: ride.riderId,
        captainId: ride.captainId,
        rating,
        comment,
      });
      setReviewSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Generate and download a PDF tax invoice
  const handleDownloadReceipt = () => {
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

    // Rider & Captain Details
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`Passenger: ${ride.rider?.name || 'Rider'}`, 14, 45);
    doc.text(`Captain: ${ride.captain?.user?.name || 'Rapido Captain'}`, 14, 52);
    doc.text(`Vehicle: ${ride.captain?.vehicleModel || 'Vehicle'} (${ride.captain?.vehicleNumber || 'KA-XX'})`, 14, 59);
    doc.text(`Vehicle Type: ${ride.vehicleType}`, 14, 66);

    // Route Details
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 73, 196, 73);

    doc.setFontSize(10);
    doc.text(`Pickup: ${ride.pickupAddress}`, 14, 82);
    doc.text(`Dropoff: ${ride.dropoffAddress}`, 14, 90);
    doc.text(`Distance: ${ride.distanceKm} km | Duration: ${ride.durationMin} mins`, 14, 98);

    doc.line(14, 105, 196, 105);

    // Fare Breakdown Table
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

    if (tip > 0) {
      doc.text('Captain Tip (100% to Driver)', 14, 157);
      doc.text(`Rs. ${tip.toFixed(2)}`, 160, 157);
    }

    doc.line(14, 165, 196, 165);

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Paid', 14, 175);
    doc.text(`Rs. ${totalPayable.toFixed(2)}`, 155, 175);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for riding with Rapido. Ride safe and always wear a helmet!', 14, 195);

    doc.save(`Rapido_Receipt_${ride.id.substring(0, 8)}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D283E]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FDFDFD] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8 border border-[#EFEFEF]">
        {/* Celebration Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 bg-[#F1F5D8] border border-[#DCE4B0] rounded-full flex items-center justify-center mx-auto text-[#7BA644] mb-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-[#2D283E]">Trip Completed!</h2>
          <p className="text-xs text-[#6E6680]">
            Hope you had a safe and smooth journey with your Captain.
          </p>
        </div>

        {/* Bill Summary Card */}
        <div className="bg-[#EFEFEF] rounded-2xl p-4 border border-[#E0E0E0] space-y-2 text-xs">
          <div className="flex justify-between text-[#6E6680] font-medium">
            <span>Ride Fare:</span>
            <span className="font-bold text-[#2D283E]">₹{ride.totalFare}</span>
          </div>

          {/* Captain Tip Section */}
          {!isPaid && (
            <div className="border-t border-[#D5D5D5] pt-2">
              <div className="flex items-center space-x-1.5 font-bold text-[#2D283E] mb-2">
                <HeartHandshake className="w-4 h-4 text-[#957DAD]" />
                <span>Tip your Captain (Optional)</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 10, 20, 50].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTip(amount)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      tip === amount
                        ? 'bg-[#957DAD] text-white border-[#957DAD] shadow-sm'
                        : 'bg-[#FDFDFD] text-[#2D283E] border-[#D5D5D5] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {amount === 0 ? 'No Tip' : `+₹${amount}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#D5D5D5] pt-2 flex justify-between font-black text-base text-[#2D283E]">
            <span>Total Payable:</span>
            <span className="text-[#784315] bg-[#FFD6A5]/50 px-2 py-0.5 rounded-lg">₹{totalPayable}</span>
          </div>
        </div>

        {/* Payment Methods */}
        {!isPaid ? (
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#6E6680]">Choose Payment Method:</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('STRIPE')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center space-y-1 text-xs font-bold transition-all ${
                  paymentMethod === 'STRIPE'
                    ? 'border-[#957DAD] bg-[#957DAD]/15 text-[#2D283E] shadow-sm ring-1 ring-[#957DAD]'
                    : 'border-[#E0E0E0] bg-[#FDFDFD] text-[#6E6680] hover:bg-[#EFEFEF]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#957DAD]" />
                <span>Stripe Card</span>
              </button>

              <button
                onClick={() => setPaymentMethod('UPI')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center space-y-1 text-xs font-bold transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-[#957DAD] bg-[#957DAD]/15 text-[#2D283E] shadow-sm ring-1 ring-[#957DAD]'
                    : 'border-[#E0E0E0] bg-[#FDFDFD] text-[#6E6680] hover:bg-[#EFEFEF]'
                }`}
              >
                <span className="font-extrabold text-[#957DAD] text-xs">UPI</span>
                <span>GPay/PhonePe</span>
              </button>

              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center space-y-1 text-xs font-bold transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-[#957DAD] bg-[#957DAD]/15 text-[#2D283E] shadow-sm ring-1 ring-[#957DAD]'
                    : 'border-[#E0E0E0] bg-[#FDFDFD] text-[#6E6680] hover:bg-[#EFEFEF]'
                }`}
              >
                <DollarSign className="w-4 h-4 text-[#7BA644]" />
                <span>Cash</span>
              </button>
            </div>

            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full bg-[#957DAD] hover:bg-[#856D9D] text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-md shadow-[#957DAD]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95"
            >
              {isProcessing ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Processing Payment...</span>
                </span>
              ) : (
                <span>Pay ₹{totalPayable} Securely</span>
              )}
            </button>
          </div>
        ) : (
          /* Payment Success & Feedback Section */
          <div className="space-y-4">
            <div className="bg-[#F1F5D8] text-[#415720] p-3 rounded-2xl border border-[#DCE4B0] text-center text-xs font-bold">
              ✓ Payment Received! Invoice is ready.
            </div>

            {/* Rating & Review */}
            {!reviewSubmitted ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#2D283E] text-center">
                  Rate your Captain ({ride.captain?.user?.name || 'Captain'})
                </div>
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating
                            ? 'text-[#FFD6A5] fill-[#FFD6A5] stroke-[#784315]'
                            : 'text-[#D5D5D5]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Share quick feedback (polite driver, smooth ride...)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#EFEFEF] border border-[#D5D5D5] rounded-xl px-3 py-2 text-xs text-[#2D283E] placeholder-[#6E6680]/70 focus:outline-none focus:ring-2 focus:ring-[#957DAD]"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  className="w-full bg-[#957DAD] hover:bg-[#856D9D] text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-[#6E6680] font-medium">
                Thank you for your rating & review! ⭐
              </div>
            )}

            {/* Download Receipt */}
            <button
              onClick={handleDownloadReceipt}
              className="w-full border-2 border-[#957DAD] hover:bg-[#957DAD] hover:text-white text-[#957DAD] font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Tax Invoice (PDF)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full bg-[#EFEFEF] hover:bg-[#E5E5E5] text-[#2D283E] font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Done & Book Next Ride
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
