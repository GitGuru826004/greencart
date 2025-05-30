import { v2 as cloudinary } from "cloudinary";
import Product from "../models/Product.js";

// Add product controller : /api/product/add
export const addProduct = async (req, res) => {
  try {
    const productData = JSON.parse(req.body.productData);
    const images = req.files;

    if (!images || images.length === 0) {
      return res.json({ success: false, message: "No images provided" });
    }

    const imagesUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    await Product.create({
      ...productData,
      image: imagesUrl, // assuming your schema uses `image`
    });

    res.json({
      success: true,
      message: "Product added successfully",
    });

  } catch (error) {
    console.log(error.message);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};


// Get product : /api/product/list
export const productList = async (req, res) => {
    try {
        const products = await Product.find({});

        return res.json({
            success: true,
            message: "Product list fetched successfully",
            products,
        });
    } catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }
}

// Get product by id : /api/product/:id
export const productById = async (req, res) => {
    try {
        const { id } = req.body;

        const product = await Product.findById(id);
        res.json({
            success: true,
            message: "Product fetched successfully",
            product,
        });
    }
    catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }
}

// Change Product instock : /api/product/stock

export const changeProductStock = async (req, res) => {
    try {
        const { id, inStock } = req.body;
        const product = await Product.findByIdAndUpdate(
            id, 
            { inStock }, 
            { new: true } // This returns the updated document
        );
        return res.json({
            success: true,
            message: "Product stock updated successfully",
            product,
        });
    } catch (error) {
        console.log(error.message);
        return res.json({
            success: false,
            message: error.message,
        });
    }
}