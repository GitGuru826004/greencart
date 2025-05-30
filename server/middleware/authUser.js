import jwt from "jsonwebtoken";  // FIXED

const authUser = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.json({ success: false, message: "Unauthorized" });
    }

    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);

        if (tokenDecode.id) {
            req.userId = tokenDecode.id;  // FIXED: Use req.userId instead of modifying body
        } else {
            return res.json({ success: false, message: "Unauthorized" });
        }

        next();
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export default authUser;
