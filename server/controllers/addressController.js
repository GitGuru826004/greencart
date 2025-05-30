import Address from "../models/Address.js";

// Add Address : //api/address/add
export const addAddress = async (req, res) => {
    try {
        // ✅ FIXED: Get userId from auth middleware OR request body
        const userId = req.userId || req.body.userId;
        const { address } = req.body;
        
        if (!userId) {
            return res.json({
                success: false,
                message: "User authentication required"
            });
        }
        
        if (!address) {
            return res.json({
                success: false,
                message: "Address data is required"
            });
        }
        
        await Address.create({...address, userId});
        res.json({
            success: true,
            message: "Address added successfully",
        });
    } catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }
}

// Get Address : //api/address/get
export const getAddress = async (req, res) => {
    try {
        // ✅ FIXED: Get userId from auth middleware (since route uses GET)
        const userId = req.userId;
        
        if (!userId) {
            return res.json({
                success: false,
                message: "User authentication required"
            });
        }
        
        const addresses = await Address.find({userId});
        res.json({
            success: true,
            address: addresses,
        });
    } catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }
}