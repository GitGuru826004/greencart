// Place order cod : /api/order/cod
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Stripe from 'stripe';

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;

    // Input validation
    if (!address || !items || items.length === 0) {
      return res.json({
        success: false,
        message: "Please add address and items",
      });
    }

    // Calculate total amount
    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.json({
          success: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      if (!product.inStock) {
        return res.json({
          success: false,
          message: `Product ${product.name} is out of stock`,
        });
      }

      amount += product.offerPrice * item.quantity;
    }

    // Add 2% Tax
    const tax = Math.floor(amount * 0.02);
    const totalAmount = amount + tax;

    // Create order
    const order = await Order.create({
      userId,
      items,
      amount: totalAmount,
      address,
      paymentType: "COD",
      isPaid: false,
    });

    // Clear cart items
    await User.findByIdAndUpdate(userId, { cartItems: {} });

    return res.json({
      success: true,
      message: "Order placed successfully",
      order,
    });

  } catch (error) {
    console.log(error.message);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// Place order STRIPE : /api/order/stripe
export const placeOrderstripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const { origin } = req.headers;

    console.log('Stripe order request:', { userId, itemsCount: items?.length, origin });

    // Input validation
    if (!address || !items || items.length === 0) {
      return res.json({
        success: false,
        message: "Please add address and items",
      });
    }

    let productData = [];
    let amount = 0;

    // Calculate total amount and build product data
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.json({
          success: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      if (!product.inStock) {
        return res.json({
          success: false,
          message: `Product ${product.name} is out of stock`,
        });
      }

      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });

      amount += product.offerPrice * item.quantity;
    }

    // Add 2% Tax
    const tax = Math.floor(amount * 0.02);
    const totalAmount = amount + tax;

    // Create order FIRST
    const order = await Order.create({
      userId,
      items,
      amount: totalAmount,
      address,
      paymentType: "Online",
      isPaid: false,
    });

    console.log('Order created:', order._id);

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create line items for stripe
    const line_items = productData.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.floor(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add tax as separate line item
    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Tax (2%)",
        },
        unit_amount: Math.floor(tax * 100),
      },
      quantity: 1,
    });

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      }
    });

    console.log('Stripe session created:', session.id);

    // DON'T clear cart here - wait for webhook confirmation
    // await User.findByIdAndUpdate(userId, { cartItems: {} });

    return res.json({
      success: true,
      url: session.url,
      message: "Redirecting to payment...",
      order,
    });

  } catch (error) {
    console.log('Stripe error:', error.message);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// Stripe webhooks - FIXED VERSION
export const stripeWebhooks = async (request, response) => {
    console.log('Webhook received!');
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers["stripe-signature"];
    
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('Webhook signature verified successfully');
    } catch (error) {
        console.log('❌ Webhook signature verification failed:', error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    console.log('Processing event:', event.type);

    // Handle the event
    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const { orderId, userId } = session.metadata;

                console.log('✅ Payment successful for order:', orderId);
                console.log('Session payment_status:', session.payment_status);

                if (!orderId || !userId) {
                    console.log('❌ Missing metadata:', { orderId, userId });
                    break;
                }

                // Mark payment as successful
                const updatedOrder = await Order.findByIdAndUpdate(
                    orderId, 
                    { 
                        isPaid: true,
                        stripeSessionId: session.id 
                    },
                    { new: true }
                );

                if (updatedOrder) {
                    console.log('✅ Order updated successfully:', updatedOrder._id);
                } else {
                    console.log('❌ Order not found:', orderId);
                }

                // Clear user cart
                await User.findByIdAndUpdate(userId, { cartItems: {} });
                console.log('✅ Cart cleared for user:', userId);
                break;
            }

            case "checkout.session.expired": {
                const session = event.data.object;
                const { orderId } = session.metadata;

                console.log('⏰ Payment session expired for order:', orderId);

                if (orderId) {
                    // Delete the unpaid order
                    await Order.findByIdAndDelete(orderId);
                    console.log('🗑️ Expired order deleted:', orderId);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                break;
        }

        response.json({ received: true });

    } catch (error) {
        console.log('❌ Error processing webhook:', error);
        console.log('Error details:', error.message);
        response.status(500).json({ 
            error: 'Webhook processing failed',
            received: false 
        });
    }
}

// Get orders by User ID : /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Getting orders for userId:', userId);

    const orders = await Order.find({
      userId,
      $or: [
        { paymentType: "COD" },
        { isPaid: true }
      ]
    })
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 });

    console.log('Orders found:', orders.length);
    console.log('Orders payment status:', orders.map(o => ({ 
      id: o._id, 
      paymentType: o.paymentType, 
      isPaid: o.isPaid 
    })));

    return res.json({
      success: true,
      orders,
    });

  } catch (error) {
    console.log('Error in getUserOrders:', error);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// Get all orders : /api/order/seller
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
        $or: [
            { paymentType: "COD" },
            { isPaid: true }
        ]
    })
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      orders,
    });

  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
}