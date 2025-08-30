import mongoose from "mongoose";

const paymentCapturedSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    default: "",
  },
  full_name: {
    type: String,
    required: true,
    default: "",
  },
  phone: {
    type: String,
    required: true,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  payment_id: {
    type: String,
    required: true,
    unique: true,
    default: "",
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  payload: {
    type: String,
    required: true,
    default: "",
  },
});

const PaymentCaptured = mongoose.model(
  "PaymentCaptured",
  paymentCapturedSchema
);

export default PaymentCaptured;
