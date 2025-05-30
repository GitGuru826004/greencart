import React, { useState, useCallback, useMemo } from 'react'
import { assets, categories } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddProduct = () => {
    const [files, setFiles] = useState([])
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [offerPrice, setOfferPrice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

    const { axios } = useAppContext();

    // Validate file size and type
    const validateFile = useCallback((file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        
        if (file.size > maxSize) {
            toast.error('Image size should be less than 5MB');
            return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPEG, PNG, and WebP images are allowed');
            return false;
        }
        
        return true;
    }, []);

    // Compress image before upload
    const compressImage = useCallback((file, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions (max 800px width/height)
                const maxDimension = 800;
                let { width, height } = img;
                
                if (width > height && width > maxDimension) {
                    height = (height * maxDimension) / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = (width * maxDimension) / height;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, file.type, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }, []);

    // Handle file change with optimization
    const handleFileChange = useCallback(async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!validateFile(file)) return;
        
        try {
            // Show loading toast
            const loadingToast = toast.loading('Processing image...');
            
            // Compress image
            const compressedFile = await compressImage(file);
            
            // Update files array
            const updatedFiles = [...files];
            updatedFiles[index] = compressedFile;
            setFiles(updatedFiles);
            
            // Update preview URLs
            const updatedPreviewUrls = [...imagePreviewUrls];
            if (updatedPreviewUrls[index]) {
                URL.revokeObjectURL(updatedPreviewUrls[index]);
            }
            updatedPreviewUrls[index] = URL.createObjectURL(compressedFile);
            setImagePreviewUrls(updatedPreviewUrls);
            
            toast.dismiss(loadingToast);
            toast.success('Image processed successfully');
        } catch (error) {
            toast.error('Failed to process image');
        }
    }, [files, imagePreviewUrls, validateFile, compressImage]);

    // Form validation
    const isFormValid = useMemo(() => {
        return name.trim() && 
               description.trim() && 
               category && 
               price && 
               offerPrice && 
               files.some(file => file); // At least one image
    }, [name, description, category, price, offerPrice, files]);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        
        if (!isFormValid) {
            toast.error('Please fill all required fields and add at least one image');
            return;
        }

        if (isSubmitting) return;
        
        setIsSubmitting(true);
        const loadingToast = toast.loading('Adding product...');

        try {
            const productData = {
                name: name.trim(),
                description: description.trim().split('\n').filter(line => line.trim()),
                category,
                price: parseFloat(price),
                offerPrice: parseFloat(offerPrice)
            }

            // Validate prices
            if (productData.offerPrice > productData.price) {
                toast.dismiss(loadingToast);
                toast.error('Offer price cannot be greater than original price');
                return;
            }

            const formData = new FormData();
            formData.append('productData', JSON.stringify(productData));
            
            // Only append non-null files
            files.forEach((file, index) => {
                if (file) {
                    formData.append('images', file, `image_${index}.${file.type.split('/')[1]}`);
                }
            });

            const { data } = await axios.post('/api/product/add', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30 second timeout
            });

            toast.dismiss(loadingToast);

            if (data.success) {
                toast.success(data.message || 'Product added successfully!');
                
                // Reset form
                setName('');
                setDescription('');
                setCategory('');
                setPrice('');
                setOfferPrice('');
                setFiles([]);
                
                // Clean up preview URLs
                imagePreviewUrls.forEach(url => {
                    if (url) URL.revokeObjectURL(url);
                });
                setImagePreviewUrls([]);
                
            } else {
                toast.error(data.message || 'Failed to add product');
            }

        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Add product error:', error);
            
            if (error.code === 'ECONNABORTED') {
                toast.error('Request timeout. Please try again.');
            } else if (error.response?.status === 413) {
                toast.error('Files too large. Please reduce image sizes.');
            } else {
                toast.error(error.response?.data?.message || error.message || 'Failed to add product');
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    // Cleanup URLs on unmount
    React.useEffect(() => {
        return () => {
            imagePreviewUrls.forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, []);

    return (
        <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between">
            <form onSubmit={onSubmitHandler} className="md:p-10 p-4 space-y-5 max-w-lg">
                <div>
                    <p className="text-base font-medium">Product Images</p>
                    <p className="text-sm text-gray-500 mb-2">Upload up to 4 images (Max 5MB each, JPEG/PNG/WebP)</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        {Array(4).fill('').map((_, index) => (
                            <label key={index} htmlFor={`image${index}`} className="relative">
                                <input 
                                    onChange={(e) => handleFileChange(e, index)}
                                    accept="image/jpeg,image/jpg,image/png,image/webp" 
                                    type="file" 
                                    id={`image${index}`} 
                                    hidden 
                                />
                                <img 
                                    className="max-w-24 cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-1 transition-colors" 
                                    src={imagePreviewUrls[index] || assets.upload_area} 
                                    width={100} 
                                    height={100}
                                    alt={`Upload ${index + 1}`}
                                />
                                {files[index] && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                        ✓
                                    </div>
                                )}
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1 max-w-md">
                    <label className="text-base font-medium" htmlFor="product-name">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                        onChange={(e) => setName(e.target.value)} 
                        value={name} 
                        id="product-name" 
                        type="text" 
                        placeholder="Enter product name" 
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 focus:border-blue-500 transition-colors" 
                        required 
                        maxLength={100}
                    />
                </div>
                
                <div className="flex flex-col gap-1 max-w-md">
                    <label className="text-base font-medium" htmlFor="product-description">
                        Product Description <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                        onChange={(e) => setDescription(e.target.value)} 
                        value={description} 
                        id="product-description" 
                        rows={4} 
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 focus:border-blue-500 transition-colors resize-none" 
                        placeholder="Enter product description..."
                        maxLength={1000}
                    />
                    <div className="text-xs text-gray-500 text-right">
                        {description.length}/1000 characters
                    </div>
                </div>
                
                <div className="w-full flex flex-col gap-1">
                    <label className="text-base font-medium" htmlFor="category">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select 
                        onChange={(e) => setCategory(e.target.value)} 
                        value={category} 
                        id="category" 
                        className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 focus:border-blue-500 transition-colors"
                        required
                    >
                        <option value="">Select Category</option>
                        {categories.map((item, index) => (
                            <option key={index} value={item.path}>{item.path}</option>  
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex-1 flex flex-col gap-1 w-32">
                        <label className="text-base font-medium" htmlFor="product-price">
                            Product Price <span className="text-red-500">*</span>
                        </label>
                        <input 
                            onChange={(e) => setPrice(e.target.value)} 
                            value={price} 
                            id="product-price" 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0.00" 
                            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 focus:border-blue-500 transition-colors" 
                            required 
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1 w-32">
                        <label className="text-base font-medium" htmlFor="offer-price">
                            Offer Price <span className="text-red-500">*</span>
                        </label>
                        <input 
                            onChange={(e) => setOfferPrice(e.target.value)} 
                            value={offerPrice} 
                            id="offer-price" 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0.00" 
                            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 focus:border-blue-500 transition-colors" 
                            required 
                        />
                    </div>
                </div>
                
                <button 
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`px-8 py-2.5 font-medium rounded transition-all cursor-pointer ${
                        isFormValid && !isSubmitting
                            ? 'bg-primary text-white hover:bg-primary-dull' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {isSubmitting ? 'Adding Product...' : 'ADD PRODUCT'}
                </button>
            </form>
        </div>
    )
}

export default AddProduct