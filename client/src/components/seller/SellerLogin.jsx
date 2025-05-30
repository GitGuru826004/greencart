import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast';

const SellerLogin = () => {
    const {isSeller, setIsSeller, navigate, axios} = useAppContext()
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            
            // Log the credentials being sent
            console.log('Attempting login with:', { email, password });
            
            const { data } = await axios.post('/api/seller/login', { 
                email: email.trim(), 
                password: password.trim()
            });
            
            console.log('Login response:', data);
            
            if (data.success) {
                setIsSeller(true);
                toast.success('Login successful!');
                navigate('/seller');
            } else {
                toast.error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Better error handling
            if (error.response) {
                // Server responded with error status
                const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
                toast.error(errorMessage);
            } else if (error.request) {
                // Request was made but no response received
                toast.error('No response from server. Check your connection.');
            } else {
                // Something else happened
                toast.error(error.message || 'An unexpected error occurred');
            }
        }
    }

    useEffect(() => {
        if (isSeller) {
            navigate("/seller");
        }
    }, [isSeller, navigate]);

    return !isSeller && (
        <form onSubmit={onSubmitHandler} className='min-h-screen flex items-center text-sm text-gray-600'>
            <div className='flex flex-col gap-5 m-auto items-start p-8 py-12 min-w-80 sm:min-w-88 rounded-lg shadow-xl border border-gray-200'>
                <p className='text-2xl font-medium m-auto'>
                    <span className='text-primary'>Seller</span>
                    Login
                </p>
                <div className='w-full'>
                    <p>Email</p>
                    <input 
                        onChange={(e) => setEmail(e.target.value)} 
                        value={email}
                        type="email" 
                        placeholder='enter your email' 
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-primary' 
                        required 
                    />
                </div>
                <div className='w-full'>
                    <p>Password</p>
                    <input 
                        onChange={(e) => setPassword(e.target.value)} 
                        value={password} 
                        type="password" 
                        placeholder='enter your password' 
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-primary' 
                        required 
                    />
                </div>
                <button className='bg-primary text-white w-full py-2 rounded-md cursor-pointer'>
                    Login
                </button>
            </div>
        </form>
    )
}

export default SellerLogin