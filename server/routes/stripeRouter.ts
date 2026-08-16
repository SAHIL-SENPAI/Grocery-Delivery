import express from "express";
import stripeWebhook from "../controllers/webhooks.js";

const StripeRouter = express.Router();

StripeRouter.post("/stripe",express.raw({type:"application/json"}),stripeWebhook)

export default StripeRouter;
