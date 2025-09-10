/**
 * Diganthadeepa Animation System
 * 
 * This script adds subtle particle animations to create a premium ambient background effect
 * inspired by the Diganthadeepa design system.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initHoverEffects();
  initScrollAnimation();
});

/**
 * Initialize the particle background animation
 */
function initParticles() {
  const particlesContainer = document.querySelector('.particles-container');
  if (!particlesContainer) return;
  
  // Create particles
  for (let i = 0; i < 50; i++) {
    createParticle(particlesContainer);
  }
}

/**
 * Create a single floating particle element
 */
function createParticle(container) {
  const particle = document.createElement('div');
  
  // Set particle styling
  particle.className = 'particle';
  particle.style.position = 'absolute';
  particle.style.width = `${Math.random() * 2 + 1}px`;
  particle.style.height = particle.style.width;
  particle.style.background = 'rgba(255, 255, 255, 0.05)';
  particle.style.borderRadius = '50%';
  
  // Random position
  particle.style.left = `${Math.random() * 100}%`;
  particle.style.top = `${Math.random() * 100}%`;
  
  // Animation properties
  particle.style.animation = `floatParticle ${Math.random() * 20 + 10}s linear infinite`;
  particle.style.opacity = Math.random() * 0.5;
  
  // Add to container
  container.appendChild(particle);
  
  // Create movement
  animateParticle(particle);
}

/**
 * Animate a particle with subtle movement
 */
function animateParticle(particle) {
  // Initial position
  let x = parseFloat(particle.style.left);
  let y = parseFloat(particle.style.top);
  
  // Random direction
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 0.1;
  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;
  
  // Animation loop
  function move() {
    // Update position
    x += dx;
    y += dy;
    
    // Wrap around screen
    if (x > 100) x = 0;
    if (y > 100) y = 0;
    if (x < 0) x = 100;
    if (y < 0) y = 100;
    
    // Apply position
    particle.style.left = `${x}%`;
    particle.style.top = `${y}%`;
    
    // Continue animation
    requestAnimationFrame(move);
  }
  
  // Start animation
  move();
}

/**
 * Add hover effects to cards and buttons
 */
function initHoverEffects() {
  // Add hover effect to glass cards
  const glassCards = document.querySelectorAll('.glass-card, .MuiCard-root');
  
  glassCards.forEach(card => {
    card.addEventListener('mouseenter', (e) => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.2)';
      card.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });
    
    card.addEventListener('mouseleave', (e) => {
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.borderColor = '';
    });
  });
}

/**
 * Add scroll-based animations
 */
function initScrollAnimation() {
  const elements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fadeInUp');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });
  
  elements.forEach(el => {
    observer.observe(el);
  });
}

// Export animation functions for potential reuse
window.diganthadeepaAnimations = {
  initParticles,
  initHoverEffects,
  initScrollAnimation
};
