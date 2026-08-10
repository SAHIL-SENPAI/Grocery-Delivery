import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt"
import  jwt  from "jsonwebtoken";
import { stat } from "node:fs";
import { updateOrderStatus } from "./orderController.js";


const generateToken = (id:string) =>{
    return jwt.sign({id,role:"delivery"},process.env.JWT_SECRET as string,{expiresIn:"30d"})
}

// Login delivery partner
// POST /api/delivery/login
export const loginPartner = async(req:Request,res:Response) =>{
    const {email,password } = req.body;

    if(!email || !password){
        return res.status(400).json({message:"Please provide email and password"})
    }

    const partner = await prisma.deliveryPartner.findUnique({
        where:{email:email.toLowerCase()}
    })

    if(!partner){
        return res.status(401).json({message:"Invalid email or password"})
    }

    if(!partner.isActive){
        return res.status(403).json({message:"Your account has been Deactivated"})
    }

    const isMatch = await bcrypt.compare(password,partner.password)

    if(!isMatch){
        return res.status(401).json({message:"Invalid email or password"})
    }

    const token = generateToken(partner.id);

    const {password:_,...partnerData} = partner;

    res.json({partner:partnerData,token})

}


// get assigned deliviries
// GET /api/delivery/my-deliveries
export const getMyDeliveries = async(req:Request,res:Response) =>{
    const {status} = req.query;

    const where:any = {deliveryPartnerId:req.partner!.id};

    if(status==="active"){
        where.status = {in: ["Assigned","Packed","Out for Delivery"]}
    }else if(status === "Completed"){
        where.status = {in: ["Delivered","Cancelled"]}
    }

    const orders = await prisma.order.findMany({
        where,
        include:{user:{select:{name:true,email:true,phone:true}}},
        orderBy:{createdAt:"desc"}
    })

    res.json({orders})
}


// get single delivery details
// GET /api/delivery/my-deliveries/:id
export const getDeliveryDetail = async(req:Request,res:Response) =>{
    const order = await prisma.order.findFirst({
        where:{id:req.params.id as string,deliveryPartnerId:req.partner!.id},
        include:{user:{select:{name:true,email:true,phone:true}}},
    })

    if(!order){
        return res.status(401).json({message:"delviery not found"})
    }

    res.json({order})
}

// complete delivery with otp
// PUT /api/delivery/my-deliveries/:id/complete
export const completeDelivery = async(req:Request,res:Response) =>{
    const  {otp} = req.body;
    const order = await prisma.order.findFirst({
        where:{id:req.params.id as string,deliveryPartnerId:req.partner!.id} 
    })

    if(!order || order.status === 'Cancelled' || order.status === "Delivered"){
        return res.status(400).json({message:"Invalid Request"})
    }

    if(order.deliveryOtp !== otp){
        return res.status(500).json({message:"Invalid OTP"})
    }

    const history = order.statusHistory as any[];

    history.push({status:"Delivered",note:"Delivered by partner",timestamp:new Date()})

    const updatedOrder = await prisma.order.update({
        where:{id:order.id},
        data:{status:"Delivered",statusHistory:history,deliveryOtp:""}
    })

    res.json({ordre:updatedOrder,message:"Delivery Completed Sucessfully"})
}

// cancel delivery
// PUT /api/delivery/my-deliveries/:id/cancel
export const cancelDelivery = async(req:Request,res:Response) =>{
    const {reason} = req.body;

    const order = await prisma.order.findFirst({
        where:{id:req.params.id as string,deliveryPartnerId:req.partner!.id} 
    })

    if(order!.status  === "Delivered"){
        return res.status(400).json({message:"Cannot cancel a delivered order"})
    }

    const history = order!.statusHistory as any[];

    history.push({status:"Delivered",note: reason || " ",timestamp:new Date()})

    const updatedOrder = await prisma.order.update({
        where:{id:order!.id},
        data:{status:"Delivered",statusHistory:history,deliveryOtp:""}
    })

    res.json({order:updatedOrder,message:"Delivery Cancelled"})
     
}

//Update order status
// PUT /api/delivery/my-deliveries/:id/status
export const updateDeliveryStatus = async(req:Request,res:Response) =>{
    const {status} = req.body;
    const allowedStatus = ['Packed',"Out for Delivery"];

    if(!allowedStatus.includes(status)){
        return res.status(400).json({message:"Invalid status update"});
    }

    const order = await prisma.order.findFirst({
        where:{id:req.params.id as string,deliveryPartnerId:req.partner!.id},
    })

    const history = order!.statusHistory as any[];

    history.push({status,note: `Status updated to${status}` || " ",timestamp:new Date()})

    const updatedOrder = await prisma.order.update({
        where:{id:order!.id},
        data:{status,statusHistory:history}
    }) 

    res.json({order:updatedOrder})
}

// update live location
// PUT /api/delivery/my-deliveries/:id/location
export const updateLocation = async(req:Request,res:Response) =>{
    const {lat,lng} = req.body;

    const order  = await prisma.order.findFirst({
        where:{id:req.params.id as string,deliveryPartnerId:req.partner!.id,
            status:{in:['Assigned','Packed','Out for Delivery']}
        },
        
    })

    await prisma.order.update({
        where:{id:order!.id},
        data:{liveLocation:{lat,lng,updatedAt:new Date()}}
    })

    res.json({success:true})
}


