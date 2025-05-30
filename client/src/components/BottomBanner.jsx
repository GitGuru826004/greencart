import React from 'react'
import { assets, features } from '../assets/assets'

const BottomBanner = () => {
  return (
    <div className='relative mt-24'>
        <img 
          src={assets.bottom_banner_image} 
          alt="bottom banner background" 
          className='w-full hidden md:block' 
        />
        <img 
          src={assets.bottom_banner_image_sm} 
          alt="bottom banner background" 
          className='w-full md:hidden' 
        />

        <div className='absolute inset-0 flex flex-col items-center md:items-end md:justify-center pt-16 md:pt-0 md:pr-24'>
            <div className='px-4 md:px-0 max-w-md md:max-w-lg'>
                <h1 className='text-2xl md:text-3xl font-semibold text-primary mb-6 text-center md:text-left'>
                  Why We Are the Best?
                </h1>
                {features.map((feature, index) => (
                    <div key={index} className='flex items-start gap-4 mt-4 mb-4'>
                        <img 
                          src={feature.icon} 
                          alt={`${feature.title} icon`} 
                          className='md:w-11 w-9 flex-shrink-0 mt-1' 
                        />
                        <div className='flex-1'>
                          <h3 className='text-lg md:text-xl font-semibold mb-1'>
                            {feature.title}
                          </h3>
                          <p className='text-gray-500/70 text-xs md:text-sm leading-relaxed'>
                            {feature.description}
                          </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  )
}

export default BottomBanner