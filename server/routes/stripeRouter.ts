import express from "express";
import stripeWebhook from "../controllers/webHooks.js";

const StripeRouter = express.Router();

StripeRouter.post("/stripe",express.raw({type:"application/json"}),stripeWebhook)

export default StripeRouter;
