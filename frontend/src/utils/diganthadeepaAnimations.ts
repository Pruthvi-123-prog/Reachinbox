import React, { useEffect } from 'react';

/**
 * Creates a particle animation in the background of a container
 * @param {string} containerId - The ID of the container element
 * @param {Object} options - Configuration options for the particles
 */
export const createParticleAnimation = (containerId: string, options = {}) => {
  const defaults = {
    count: 50,
    colors: ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.3)'],
    minSize: 1,
    maxSize: 4,
    minSpeed: 0.5,
    maxSpeed: 1.5,
    opacity: 0.6,
  };
  
  const config = { ...defaults, ...options };
  
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Set container style
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Create particles
    const particles = Array.from({ length: config.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      speedX: (Math.random() - 0.5) * (config.maxSpeed - config.minSpeed),
      speedY: (Math.random() - 0.5) * (config.maxSpeed - config.minSpeed),
      opacity: 0.3 + Math.random() * config.opacity,
    }));
    
    // Animation loop
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.speedX *= -1;
        }
        
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.speedY *= -1;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.closePath();
      });
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    // Handle window resize
    const handleResize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [containerId]);
};

/**
 * React hook to add particle animation to a container
 * @param {string} containerId - The ID of the container element
 * @param {Object} options - Configuration options for the particles
 */
export const useParticleAnimation = (containerId: string, options = {}) => {
  useEffect(() => {
    createParticleAnimation(containerId, options);
  }, [containerId, options]);
};

/**
 * Creates a starfield background animation
 * @param {string} containerId - The ID of the container element
 */
export const createStarfieldAnimation = (containerId: string) => {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Set container style
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Create stars
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      pulse: Math.random() * 0.03,
      pulseDirection: 1,
    }));
    
    // Animation loop
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => {
        // Pulse effect
        star.opacity += star.pulse * star.pulseDirection;
        if (star.opacity > 1 || star.opacity < 0.2) {
          star.pulseDirection *= -1;
        }
        
        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
        ctx.closePath();
      });
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    // Handle window resize
    const handleResize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [containerId]);
};

/**
 * React hook to add starfield animation to a container
 * @param {string} containerId - The ID of the container element
 */
export const useStarfieldAnimation = (containerId: string) => {
  useEffect(() => {
    createStarfieldAnimation(containerId);
  }, [containerId]);
};

export default {
  createParticleAnimation,
  useParticleAnimation,
  createStarfieldAnimation,
  useStarfieldAnimation,
};
