import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: "user",
    },
    items: [
        {
            product: {
                type: String,
                required: true,
                ref: "product",
            },
            quantity: {
                type: Number,
                required: true,
            },
        },
    ],
    amount: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
        required: true,
        ref: "address",
    },
    status: {
        type: String,
        default: "order Placed",
    },
    paymentType: {
        type: String,
        required: true,
    },
    isPaid: {  // ✅ Fixed: colon instead of missing colon
        type: Boolean,
        required: true,
        default: false,
    }
}, { timestamps: true }); // ✅ Removed extraneous closing brace

const Order = mongoose.models.order || mongoose.model("order", orderSchema);
export default Order;
