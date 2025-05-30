
import express from 'express';
import { sellerLogin,isSellerAuth,sellerLogout } from '../controllers/sellerController.js';
import authSeller from '../middleware/authSeller.js';
const sellerRouter = express.Router();  

sellerRouter.post('/login',sellerLogin);
sellerRouter.get('/auth',authSeller,isSellerAuth)
sellerRouter.get('/logout',sellerLogout)

export default sellerRouter;