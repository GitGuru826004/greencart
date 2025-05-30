import User from "../models/User.js";

// update User cartdata : /api/cart/update
export const updateCart = async (req, res) => {
    try {
        // ✅ FIXED: Get userId from auth middleware OR request body
        const userId = req.userId || req.body.userId;
        const { cartItems } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                message: "User ID is required"
            });
        }
        
        if (!cartItems) {
            return res.json({
                success: false,
                message: "Cart items are required"
            });
        }
        
        await User.findByIdAndUpdate(userId, { cartItems });
        res.json({
            success: true,
            message: "Cart updated successfully",
        });
    } catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }   
}