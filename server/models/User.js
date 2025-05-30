import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartItems: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    }, {minimize:false}
    );


const User = mongoose.models.user || mongoose.model("user", userSchema);

export default User;