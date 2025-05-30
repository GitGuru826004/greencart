// Place order cod : /api/order/cod
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Stripe from 'stripe'; // Fixed: Capital S and proper import

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

    // Clear cart items (assuming in User model)
    await User.findByIdAndUpdate(userId, { cartItems: [] });

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

      // Fixed: Add to productData after validation
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

    // Create order
    const order = await Order.create({
      userId,
      items,
      amount: totalAmount,
      address,
      paymentType: "Online",
      isPaid: false,
    });

    // Fixed: Initialize Stripe correctly
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Fixed: Create line items for stripe (removed double tax calculation)
    const line_items = productData.map((item) => {
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.floor(item.price * 100), // Fixed: Remove double tax
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

    // Fixed: Create session (sessions plural and metadata spelling)
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: { // Fixed: metadata not metaData
        orderId: order._id.toString(),
        userId,
      }
    });

    // Clear cart items
    await User.findByIdAndUpdate(userId, { cartItems: [] });

    return res.json({
      success: true,
      url: session.url,
      message: "Order placed successfully",
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

// Stripe webhooks
export const stripeWebhooks = async (request, response) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Fixed import

    const sig = request.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.log('Webhook signature verification failed:', error.message);
        return response.status(400).send(`Webhook Error: ${error.message}`); // Added return
    }

    // Handle the event
    try {
        switch (event.type) {
            case "checkout.session.completed": { // Fixed event type
                const session = event.data.object;
                const { orderId, userId } = session.metadata;

                console.log('Payment successful for order:', orderId);

                // Mark payment as successful
                await Order.findByIdAndUpdate(orderId, { isPaid: true });

                // Clear user cart (already cleared during order placement, but double-check)
                await User.findByIdAndUpdate(userId, { cartItems: {} });
                break;
            }

            case "checkout.session.expired": { // Fixed event type
                const session = event.data.object;
                const { orderId } = session.metadata;

                console.log('Payment session expired for order:', orderId);

                // Delete the unpaid order
                await Order.findByIdAndDelete(orderId);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                break;
        }

        response.json({ received: true }); // Fixed typo

    } catch (error) {
        console.log('Error processing webhook:', error);
        response.status(500).json({ 
            error: 'Webhook processing failed',
            received: false 
        });
    }
}




// Get orders by User ID : /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.userId; // Use req.userId instead of req.user.id
    console.log('userId from req.userId:', userId); // Debug

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

    console.log('Orders found:', orders.length); // Debug

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