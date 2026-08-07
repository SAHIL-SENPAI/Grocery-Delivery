import express from "express";
import auth from "../middleware/auth.js";
import { createOrder, getAllOrders, getOrder, getOrderLocation, getUserOrders, updateOrderStatus } from "../controllers/orderController.js";
import admin from "../middleware/admin.js";

const orderRouter = express.Router();

orderRouter.post('/',auth,createOrder);
orderRouter.get('/',auth,getUserOrders);
orderRouter.get('/:id',auth,getOrder);
orderRouter.get('/:id/location',auth,getOrderLocation);

// admin routes
orderRouter.get('/all',auth,admin,getAllOrders);
orderRouter.put('/:id',auth,admin,updateOrderStatus);

export default orderRouter;
