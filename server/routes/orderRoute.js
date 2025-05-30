import express from 'express';
import authUser from '../middleware/authUser.js';
import { getAllOrders, getUserOrders, placeOrderCOD, placeOrderstripe, stripeWebhooks } from '../controllers/orderController.js';
import authSeller from '../middleware/authSeller.js';

const orderRouter = express.Router();

orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.post('/stripe', authUser, placeOrderstripe);
// ✅ Add webhook route
orderRouter.post('/webhook', stripeWebhooks);

export default orderRouter;