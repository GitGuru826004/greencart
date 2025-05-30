import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import axios from "axios";

axios.defaults.withCredentials=true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);    
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  //Fetch seller status
  const fetchSeller = async ()=>{
    try {
      const {data}= await axios.get('/api/seller/auth');
      if(data.success){
        setIsSeller(true);
      }
    else{
       setIsSeller(false);
    }

    } catch (error) {
      setIsSeller(false);
    }
  }

  //Fetch User Auth Status, User data and Cart Items
  const fetchUser = async () => {
    try {
      const {data} = await axios.get('/api/user/auth');
      if(data.success){
        setUser(data.user)
        setCartItems(data.user.cartItems || {}) // Added fallback
      }
    } catch (error) {
        setUser(null)
        setCartItems({}) // Reset cart on error
    }
  }

  // Fetch all products
  const fetchProducts = async () => {
    try {
      const {data} = await axios.get('/api/product/list');
      if (data.success){
        setProducts(data.products);
      } else{
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  };

  // Add Product to Cart
  const addToCart = (itemId) => {
    let cartData = structuredClone(cartItems);

    if (cartData[itemId]) {
      cartData[itemId] += 1;
    } else {
      cartData[itemId] = 1;
    }
    
    setCartItems(cartData);
    toast.success("Item added to cart");
  };

  // Update Cart Item Quantity
  const updateCartItem = (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId] = quantity;
    setCartItems(cartData);
    toast.success("Item quantity updated");
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    
    if (cartData[itemId]) {
      cartData[itemId] -= 1;
      // If quantity reaches 0, remove the item entirely
      if (cartData[itemId] === 0) {
        delete cartData[itemId];
      }
    }
    setCartItems(cartData);
    toast.success("Item removed from cart");
  };

  // Get cart item count
  const getCartCount = () => {
    let totalCount = 0;
    for (const item in cartItems) {
      totalCount += cartItems[item];
    }
    return totalCount;
  };

  // Get cart item total price
  const getCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      let itemInfo = products.find((product) => product._id === item);
      if (cartItems[item] > 0 && itemInfo) {
        totalAmount += itemInfo.offerPrice * cartItems[item];
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  useEffect(() => {
    fetchUser();
    fetchSeller();
    fetchProducts();
  }, []);

  // ✅ FIXED: Single useEffect for updating cart - removed duplicate
  useEffect(() => {
    const updateCart = async () => {
      try {
        // ✅ FIXED: Better validation
        if (!user || !user._id) {
          return;
        }

        const { data } = await axios.post('/api/cart/update', { 
          userId: user._id,
          cartItems 
        });
        
        if (!data.success) {
          toast.error(data.message);
        }
      } catch (error) {
        console.error('Cart update error:', error);
        toast.error(error.response?.data?.message || error.message);
      }
    }

    // ✅ FIXED: Better condition check
    if (user && user._id && typeof cartItems === 'object') {
      updateCart();
    }
  }, [cartItems, user]);

  const value = { 
    navigate, 
    user, 
    setUser, 
    isSeller, 
    setIsSeller, 
    showUserLogin, 
    setShowUserLogin, 
    products,
    currency,
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    searchQuery,
    setSearchQuery,
    getCartAmount,
    getCartCount,
    axios,
    fetchProducts,
    setCartItems
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};