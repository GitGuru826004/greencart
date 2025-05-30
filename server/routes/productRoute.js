import express from "express";
import { upload } from "../configs/multer.js";
import authSeller from "../middleware/authSeller.js";
import { addProduct,changeProductStock,productById,productList } from "../controllers/productController.js";

const productRouter = express.Router();

productRouter.post('/add', upload.array(["images"]), authSeller, addProduct);
productRouter.get('/list', productList);
productRouter.get('/list/id', productById);
productRouter.post('/stock',authSeller, changeProductStock)

export default productRouter;
