/**
 * WANDERLUST PORTAL - MERGED JAVASCRIPT
 * Single file containing all functionality for the single-page application
 * Includes: Common utilities, Registration, Blog carousels, Itinerary, and Confirmation
 */

// ========================================
// NAVIGATION SYSTEM FOR SPA
// ========================================

let currentPage = 'registration';

function navigateTo(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageName;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update URL hash without triggering reload
    window.location.hash = pageName;
    
    // Initialize page-specific functionality
    initializePage(pageName);
  }
}

// Handle hash navigation
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.substring(1);
  if (hash && ['registration', 'blog', 'itinerary', 'confirmation'].includes(hash)) {
    navigateTo(hash);
  }
});

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.substring(1);
  if (hash && ['registration', 'blog', 'itinerary', 'confirmation'].includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('registration');
  }
});

// ========================================
// PAGE INITIALIZATION
// ========================================

function initializePage(pageName) {
  // Initialize Feather icons for the current page
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
  
  // Page-specific initialization
  switch(pageName) {
    case 'registration':
      initRegistrationPage();
      break;
    case 'blog':
      initBlogPage();
      break;
    case 'itinerary':
      initItineraryPage();
      break;
    case 'confirmation':
      initConfirmationPage();
      break;
  }
}

// ========================================
// COMMON UTILITIES - MODAL SYSTEM
// ========================================

/**
 * Show a custom modal dialog
 */
function showModal(options) {
  const {
    title = 'Notification',
    message = '',
    icon = 'check-circle',
    type = 'success',
    confirmText = 'OK',
    cancelText = null,
    onConfirm = null,
    onCancel = null,
    closeOnOverlay = true,
    autoRedirect = false
  } = options;

  // Remove existing modals
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  // Create modal content
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" aria-label="Close modal">
        <i data-feather="x"></i>
      </button>
      <div class="modal-header">
        <div class="modal-icon ${type}">
          <i data-feather="${icon}"></i>
        </div>
        <h3 class="modal-title" id="modal-title">${title}</h3>
      </div>
      <div class="modal-body">
        ${message}
        ${autoRedirect ? '<p id="redirect-timer" style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem; text-align: center;">Redirecting in <strong>5</strong> seconds...</p>' : ''}
      </div>
      <div class="modal-footer">
        ${cancelText ? `<button class="btn btn-secondary modal-cancel">${cancelText}</button>` : ''}
        <button class="btn btn-primary modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(overlay);

  // Initialize Feather icons in modal
  if (typeof feather !== 'undefined') {
    feather.replace();
  }

  // Get modal elements
  const modal = overlay.querySelector('.modal');
  const closeBtn = overlay.querySelector('.modal-close');
  const confirmBtn = overlay.querySelector('.modal-confirm');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  // Focus trap elements
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  // Close modal function
  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  };

  // Close button handler
  closeBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
    closeModal();
  });

  // Overlay click handler
  if (closeOnOverlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onCancel) onCancel();
        closeModal();
      }
    });
  }

  // Confirm button handler
  confirmBtn.addEventListener('click', () => {
    if (onConfirm) onConfirm();
    closeModal();
  });

  // Cancel button handler
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      closeModal();
    });
  }

  // ESC key handler
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      if (onCancel) onCancel();
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Focus trap
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  });

  // Focus first button
  setTimeout(() => {
    confirmBtn.focus();
  }, 100);

  // Auto-redirect timer for success modals
  if (autoRedirect && type === 'success') {
    let countdown = 5;
    const timerElement = document.getElementById('redirect-timer');
    
    const timer = setInterval(() => {
      countdown--;
      if (timerElement) {
        timerElement.innerHTML = `Redirecting in <strong>${countdown}</strong> second${countdown !== 1 ? 's' : ''}...`;
      }
      
      if (countdown <= 0) {
        clearInterval(timer);
        if (onConfirm) onConfirm();
        closeModal();
      }
    }, 1000);
    
    // Clear timer if user manually closes or confirms
    confirmBtn.addEventListener('click', () => {
      clearInterval(timer);
    }, { once: true });
    
    closeBtn.addEventListener('click', () => {
      clearInterval(timer);
    }, { once: true });
  }
}

// ========================================
// COMMON UTILITIES - LOCAL STORAGE
// ========================================

function saveUserData(userData) {
  try {
    localStorage.setItem('wl_user', JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}

function getUserData() {
  try {
    const data = localStorage.getItem('wl_user');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user data:', error);
    return null;
  }
}

function saveItineraryData(itineraryData) {
  try {
    localStorage.setItem('wl_itinerary', JSON.stringify(itineraryData));
    return true;
  } catch (error) {
    console.error('Error saving itinerary data:', error);
    return false;
  }
}

function getItineraryData() {
  try {
    const data = localStorage.getItem('wl_itinerary');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading itinerary data:', error);
    return null;
  }
}

function clearAllData() {
  try {
    localStorage.removeItem('wl_user');
    localStorage.removeItem('wl_itinerary');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}

// ========================================
// COMMON UTILITIES - VALIDATION
// ========================================

function validatePhone(phone) {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
}

function validatePIN(pin) {
  const pinRegex = /^\d{6}$/;
  return pinRegex.test(pin);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(input, message) {
  const formGroup = input.closest('.form-group');
  if (!formGroup) return;

  const existingError = formGroup.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }

  input.classList.add('error');
  input.classList.remove('success');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `<i data-feather="alert-circle" style="width: 16px; height: 16px;"></i> ${message}`;
  
  formGroup.appendChild(errorDiv);

  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

function showSuccess(input) {
  const formGroup = input.closest('.form-group');
  
  const existingError = formGroup ? formGroup.querySelector('.error-message') : null;
  if (existingError) {
    existingError.remove();
  }

  input.classList.remove('error');
  input.classList.add('success');
}

function clearValidation(input) {
  const formGroup = input.closest('.form-group');
  const existingError = formGroup ? formGroup.querySelector('.error-message') : null;
  if (existingError) {
    existingError.remove();
  }
  input.classList.remove('error', 'success');
}

// ========================================
// COMMON UTILITIES - HELPERS
// ========================================

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 10) return phone;
  return `******${phone.slice(-4)}`;
}

function smoothScrollTo(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// REGISTRATION PAGE
// ========================================

let registrationInitialized = false;

function initRegistrationPage() {
  if (registrationInitialized) return;
  registrationInitialized = true;
  
  const form = document.getElementById('registrationForm');
  const phoneInput = document.getElementById('phone');
  const pinInput = document.getElementById('pin');
  const emailInput = document.getElementById('email');

  if (!form || !phoneInput || !pinInput || !emailInput) return;

  // Phone validation
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length === 10) {
      validatePhoneField();
    }
  });

  phoneInput.addEventListener('blur', validatePhoneField);

  function validatePhoneField() {
    const value = phoneInput.value.trim();
    
    if (!value) {
      showError(phoneInput, 'Phone number is required');
      return false;
    }
    
    if (!validatePhone(value)) {
      showError(phoneInput, 'Please enter a valid 10-digit phone number');
      return false;
    }
    
    showSuccess(phoneInput);
    return true;
  }

  // PIN validation
  pinInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length === 6) {
      validatePINField();
    }
  });

  pinInput.addEventListener('blur', validatePINField);

  function validatePINField() {
    const value = pinInput.value.trim();
    
    if (!value) {
      showError(pinInput, 'PIN code is required');
      return false;
    }
    
    if (!validatePIN(value)) {
      showError(pinInput, 'Please enter a valid 6-digit PIN');
      return false;
    }
    
    showSuccess(pinInput);
    return true;
  }

  // Email validation
  emailInput.addEventListener('input', debounce(() => {
    if (emailInput.value.trim()) {
      validateEmailField();
    }
  }, 500));

  emailInput.addEventListener('blur', validateEmailField);

  function validateEmailField() {
    const value = emailInput.value.trim();
    
    if (!value) {
      showError(emailInput, 'Email address is required');
      return false;
    }
    
    if (!validateEmail(value)) {
      showError(emailInput, 'Please enter a valid email address');
      return false;
    }
    
    showSuccess(emailInput);
    return true;
  }

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isPhoneValid = validatePhoneField();
    const isPINValid = validatePINField();
    const isEmailValid = validateEmailField();

    if (!isPhoneValid) {
      phoneInput.focus();
      return;
    }
    
    if (!isPINValid) {
      pinInput.focus();
      return;
    }
    
    if (!isEmailValid) {
      emailInput.focus();
      return;
    }

    const userData = {
      phone: phoneInput.value.trim(),
      pin: pinInput.value.trim(),
      email: emailInput.value.trim()
    };

    const saved = saveUserData(userData);

    if (saved) {
      showModal({
        title: 'Registration Successful!',
        message: 'Welcome to Wanderlust Portal. Get ready to explore amazing destinations around the world.',
        icon: 'check-circle',
        type: 'success',
        confirmText: 'Continue',
        closeOnOverlay: false,
        autoRedirect: true,
        onConfirm: () => {
          navigateTo('blog');
        }
      });
    } else {
      showModal({
        title: 'Registration Failed',
        message: 'Unable to save your registration data. Please try again.',
        icon: 'alert-circle',
        type: 'error',
        confirmText: 'Try Again'
      });
    }
  });

  // Clear validation on focus
  [phoneInput, pinInput, emailInput].forEach(input => {
    input.addEventListener('focus', () => {
      if (!input.classList.contains('success')) {
        clearValidation(input);
      }
    });
  });

  // Prevent paste of non-numeric in phone/PIN
  [phoneInput, pinInput].forEach(input => {
    input.addEventListener('paste', (e) => {
      const pastedText = e.clipboardData.getData('text');
      if (!/^\d+$/.test(pastedText)) {
        e.preventDefault();
        showError(input, 'Only numbers are allowed');
      }
    });
  });
}

// ========================================
// BLOG PAGE
// ========================================

let blogInitialized = false;

function initBlogPage() {
  if (blogInitialized) return;
  blogInitialized = true;
  
  // Hamburger menu functionality
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const blogNavLinks = document.getElementById('blogNavLinks');
  
  if (hamburgerMenu && blogNavLinks) {
    hamburgerMenu.addEventListener('click', () => {
      hamburgerMenu.classList.toggle('active');
      blogNavLinks.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    const navLinks = blogNavLinks.querySelectorAll('.blog-nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburgerMenu.classList.remove('active');
        blogNavLinks.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburgerMenu.contains(e.target) && !blogNavLinks.contains(e.target)) {
        hamburgerMenu.classList.remove('active');
        blogNavLinks.classList.remove('active');
      }
    });
  }
  
  // Image carousel functionality
  const carousels = document.querySelectorAll('.carousel');
  
  carousels.forEach(carousel => {
    const container = carousel.querySelector('.carousel-container');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-btn-prev');
    const nextBtn = carousel.querySelector('.carousel-btn-next');
    const indicators = carousel.querySelectorAll('.carousel-indicator');
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoplayInterval;
    
    function updateCarousel() {
      container.style.transform = `translateX(-${currentSlide * 100}%)`;
      
      indicators.forEach((indicator, index) => {
        if (index === currentSlide) {
          indicator.classList.add('active');
        } else {
          indicator.classList.remove('active');
        }
      });
    }
    
    function nextSlide() {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel();
    }
    
    function prevSlide() {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateCarousel();
    }
    
    function goToSlide(index) {
      currentSlide = index;
      updateCarousel();
    }
    
    function startAutoplay() {
      autoplayInterval = setInterval(nextSlide, 5000);
    }
    
    function stopAutoplay() {
      clearInterval(autoplayInterval);
    }
    
    nextBtn.addEventListener('click', () => {
      nextSlide();
      stopAutoplay();
      startAutoplay();
    });
    
    prevBtn.addEventListener('click', () => {
      prevSlide();
      stopAutoplay();
      startAutoplay();
    });
    
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        goToSlide(index);
        stopAutoplay();
        startAutoplay();
      });
    });
    
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        stopAutoplay();
        startAutoplay();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        stopAutoplay();
        startAutoplay();
      }
    });
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    carousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoplay();
    });
    
    carousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
      startAutoplay();
    });
    
    function handleSwipe() {
      const swipeThreshold = 50;
      if (touchStartX - touchEndX > swipeThreshold) {
        nextSlide();
      } else if (touchEndX - touchStartX > swipeThreshold) {
        prevSlide();
      }
    }
    
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    
    startAutoplay();
  });

  // Smooth scrolling for navigation links
  const navLinks = document.querySelectorAll('.blog-nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        const navHeight = document.querySelector('.blog-nav').offsetHeight;
        const targetPosition = targetSection.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        navLinks.forEach(l => {
          l.style.background = '';
          l.style.color = '';
        });
        link.style.background = '#e7f3ff';
        link.style.color = 'var(--btn-primary)';
      }
    });
  });

  // Highlight active section on scroll
  const sections = document.querySelectorAll('.destination-section');
  const nav = document.querySelector('.blog-nav');
  
  if (nav) {
    const navHeight = nav.offsetHeight;
    
    function highlightActiveSection() {
      const scrollPosition = window.scrollY + navHeight + 100;
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const sectionId = section.getAttribute('id');
        const correspondingLink = document.querySelector(`.blog-nav-link[href="#${sectionId}"]`);
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          navLinks.forEach(link => {
            link.style.background = '';
            link.style.color = '';
          });
          
          if (correspondingLink) {
            correspondingLink.style.background = '#e7f3ff';
            correspondingLink.style.color = 'var(--btn-primary)';
          }
        }
      });
    }
    
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
      }
      scrollTimeout = window.requestAnimationFrame(() => {
        highlightActiveSection();
      });
    });
    
    highlightActiveSection();
  }
}

// ========================================
// ITINERARY PAGE
// ========================================

let itineraryInitialized = false;

const tripOptions = [
  // Destinations
  { id: 'dest-paris', title: 'Paris, France', price: 450 },
  { id: 'dest-tokyo', title: 'Tokyo, Japan', price: 580 },
  { id: 'dest-rome', title: 'Rome, Italy', price: 420 },
  { id: 'dest-newyork', title: 'New York, USA', price: 520 },
  { id: 'dest-london', title: 'London, UK', price: 480 },
  
  // Travel Options
  { id: 'flight', title: 'Round-Trip Flight', price: 1200 },
  { id: 'hotel', title: 'Luxury Hotel Stay', price: 2100 },
  { id: 'car', title: 'Car Rental', price: 450 },
  { id: 'airport', title: 'Airport Transfers', price: 120 },
  
  // Food Packages
  { id: 'breakfast', title: 'Daily Breakfast', price: 180 },
  { id: 'allinclusive', title: 'All-Inclusive Dining', price: 750 },
  { id: 'finedining', title: 'Fine Dining Experience', price: 420 },
  { id: 'foodtour', title: 'Local Food Tour', price: 280 },
  
  // Activities
  { id: 'citytour', title: 'City Sightseeing Tour', price: 150 },
  { id: 'museum', title: 'Museum Pass', price: 95 },
  { id: 'adventure', title: 'Adventure Activities', price: 380 },
  { id: 'spa', title: 'Spa & Wellness Package', price: 240 },
  { id: 'nightlife', title: 'Nightlife Experience', price: 180 },
  { id: 'cruise', title: 'Sunset Cruise', price: 320 }
];

let selectedItems = [];

function initItineraryPage() {
  if (itineraryInitialized) return;
  itineraryInitialized = true;
  
  const checkboxes = document.querySelectorAll('#page-itinerary input[type="checkbox"]');
  const selectedItemsContainer = document.getElementById('selectedItems');
  const totalPriceElement = document.getElementById('totalPrice');
  const confirmBtn = document.getElementById('confirmTripBtn');

  if (!selectedItemsContainer || !totalPriceElement || !confirmBtn) return;

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateSelection();
      updateSummary();
      animateCheckbox(checkbox);
    });
  });

  function updateSelection() {
    selectedItems = [];
    
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        const optionId = checkbox.getAttribute('data-id');
        const option = tripOptions.find(opt => opt.id === optionId);
        
        if (option) {
          selectedItems.push(option);
        }
      }
    });
  }

  function updateSummary() {
    if (selectedItems.length === 0) {
      selectedItemsContainer.innerHTML = `
        <p style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">
          <i data-feather="info" style="width: 24px; height: 24px; margin-bottom: 0.5rem;"></i><br>
          No items selected yet
        </p>
      `;
      totalPriceElement.textContent = '₹0';
      
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      return;
    }

    const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

    const destinations = selectedItems.filter(item => item.id.startsWith('dest-'));
    const otherItems = selectedItems.filter(item => !item.id.startsWith('dest-'));

    let itemsHTML = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
    
    if (destinations.length > 0) {
      itemsHTML += `
        <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 2px solid var(--btn-primary);">
          <div style="font-weight: 600; color: var(--btn-primary); margin-bottom: 0.75rem; font-size: 0.9rem;">
            📍 DESTINATIONS (Visa, Insurance & Taxes)
          </div>
      `;
      destinations.forEach(dest => {
        itemsHTML += `
          <div class="price-row" style="margin-bottom: 0; padding-bottom: 0.5rem;">
            <span class="price-label" style="font-size: 0.9rem;">${dest.title}</span>
            <span class="price-value" style="font-size: 0.9rem;">${formatCurrency(dest.price)}</span>
          </div>
        `;
      });
      itemsHTML += '</div>';
    }
    
    if (otherItems.length > 0) {
      otherItems.forEach(item => {
        itemsHTML += `
          <div class="price-row" style="margin-bottom: 0; padding-bottom: 0.75rem;">
            <span class="price-label" style="font-size: 0.95rem;">${item.title}</span>
            <span class="price-value">${formatCurrency(item.price)}</span>
          </div>
        `;
      });
    }
    
    itemsHTML += '</div>';
    
    selectedItemsContainer.innerHTML = itemsHTML;
    totalPriceElement.textContent = formatCurrency(total);
  }

  function animateCheckbox(checkbox) {
    const checkboxItem = checkbox.closest('.checkbox-item');
    
    if (checkbox.checked) {
      checkboxItem.style.borderColor = 'var(--btn-primary)';
      checkboxItem.style.background = '#e7f3ff';
      
      const price = checkboxItem.querySelector('.checkbox-price');
      price.style.transform = 'scale(1.1)';
      setTimeout(() => {
        price.style.transform = 'scale(1)';
      }, 200);
    } else {
      checkboxItem.style.borderColor = 'var(--border-color)';
      checkboxItem.style.background = 'var(--bg-card)';
    }
  }

  confirmBtn.addEventListener('click', () => {
    if (selectedItems.length === 0) {
      showModal({
        title: 'No Items Selected',
        message: 'Please select at least one travel option, food package, or activity to continue.',
        icon: 'alert-circle',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }

    // Check if at least one destination is selected
    const hasDestination = selectedItems.some(item => item.id.startsWith('dest-'));
    if (!hasDestination) {
      showModal({
        title: 'No Destination Selected',
        message: 'Please select at least one destination for your trip.',
        icon: 'alert-circle',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }

    const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

    let itemsList = '<ul style="text-align: left; margin: 1rem 0; padding-left: 1.5rem; line-height: 2;">';
    selectedItems.forEach(item => {
      itemsList += `<li>${item.title} - ${formatCurrency(item.price)}</li>`;
    });
    itemsList += '</ul>';
    itemsList += `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--btn-primary); font-size: 1.25rem; font-weight: 600; color: var(--btn-primary);">
      Total: ${formatCurrency(total)}
    </div>`;

    showModal({
      title: 'Confirm Your Trip',
      message: `
        <p style="margin-bottom: 1rem;">You have selected the following items:</p>
        ${itemsList}
        <p style="margin-top: 1rem;">Are you ready to proceed?</p>
      `,
      icon: 'check-circle',
      type: 'success',
      confirmText: 'Confirm Booking',
      cancelText: 'Review Again',
      closeOnOverlay: false,
      onConfirm: () => {
        const itineraryData = {
          selected: selectedItems.map(item => item.id),
          items: selectedItems,
          total: total,
          timestamp: new Date().toISOString()
        };
        
        const saved = saveItineraryData(itineraryData);
        
        if (saved) {
          showModal({
            title: 'Booking Confirmed!',
            message: 'Your trip has been successfully booked. Redirecting to confirmation page...',
            icon: 'check-circle',
            type: 'success',
            confirmText: 'View Confirmation',
            closeOnOverlay: false,
            autoRedirect: true,
            onConfirm: () => {
              navigateTo('confirmation');
            }
          });
        } else {
          showModal({
            title: 'Error',
            message: 'Unable to save your trip data. Please try again.',
            icon: 'alert-circle',
            type: 'error',
            confirmText: 'OK'
          });
        }
      }
    });
  });

  // Load previous selection if exists
  const previousItinerary = getItineraryData();
  if (previousItinerary && previousItinerary.selected) {
    previousItinerary.selected.forEach(itemId => {
      const checkbox = document.querySelector(`#page-itinerary input[data-id="${itemId}"]`);
      if (checkbox) {
        checkbox.checked = true;
        animateCheckbox(checkbox);
      }
    });
    
    updateSelection();
    updateSummary();
  }

  // Prevent conflicting food selections
  const breakfastCheckbox = document.getElementById('breakfast');
  const allInclusiveCheckbox = document.getElementById('allinclusive');
  
  if (breakfastCheckbox && allInclusiveCheckbox) {
    allInclusiveCheckbox.addEventListener('change', () => {
      if (allInclusiveCheckbox.checked && breakfastCheckbox.checked) {
        breakfastCheckbox.checked = false;
        animateCheckbox(breakfastCheckbox);
        updateSelection();
        updateSummary();
        
        showModal({
          title: 'Selection Updated',
          message: 'Daily Breakfast has been deselected as it\'s included in the All-Inclusive Dining package.',
          icon: 'alert-circle',
          type: 'warning',
          confirmText: 'Got it'
        });
      }
    });
  }

  // Animate categories on load
  const categories = document.querySelectorAll('#page-itinerary .option-category');
  categories.forEach((category, index) => {
    category.style.opacity = '0';
    category.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      category.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      category.style.opacity = '1';
      category.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

// ========================================
// CONFIRMATION PAGE
// ========================================

let confirmationInitialized = false;

function initConfirmationPage() {
  if (confirmationInitialized) return;
  confirmationInitialized = true;
  
  const userData = getUserData();
  const itineraryData = getItineraryData();

  if (!userData || !itineraryData) {
    showModal({
      title: 'No Booking Found',
      message: 'We couldn\'t find your booking information. Please start a new journey.',
      icon: 'alert-circle',
      type: 'warning',
      confirmText: 'Start New Journey',
      closeOnOverlay: false,
      onConfirm: () => {
        navigateTo('registration');
      }
    });
    return;
  }

  // Display user information
  const userEmailElement = document.getElementById('userEmail');
  const userPhoneElement = document.getElementById('userPhone');
  const bookingDateElement = document.getElementById('bookingDate');

  if (userEmailElement && userData.email) {
    userEmailElement.textContent = userData.email;
  }

  if (userPhoneElement && userData.phone) {
    userPhoneElement.textContent = maskPhone(userData.phone);
  }

  if (bookingDateElement && itineraryData.timestamp) {
    const date = new Date(itineraryData.timestamp);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    bookingDateElement.textContent = date.toLocaleDateString('en-US', options);
  }

  // Display trip items
  const tripItemsContainer = document.getElementById('tripItems');
  const totalAmountElement = document.getElementById('totalAmount');

  if (itineraryData.items && itineraryData.items.length > 0) {
    let itemsHTML = '';
    
    itineraryData.items.forEach((item, index) => {
      itemsHTML += `
        <div class="summary-item" style="animation: slideUp 0.5s ease forwards; animation-delay: ${index * 0.1}s; opacity: 0;">
          <span class="summary-label">${item.title}</span>
          <span class="summary-value">${formatCurrency(item.price)}</span>
        </div>
      `;
    });
    
    tripItemsContainer.innerHTML = itemsHTML;
  } else {
    tripItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No items found</p>';
  }

  if (totalAmountElement && itineraryData.total) {
    totalAmountElement.textContent = formatCurrency(itineraryData.total);
  }

  // Confetti animation
  function createConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const colors = ['#56c8ff', '#667eea', '#764ba2', '#51cf66', '#ffd43b'];
    const confettiCount = 50;
    const confetti = [];
    
    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: Math.random() * 0.2 - 0.1
      });
    }
    
    function drawConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      confetti.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
        
        c.y += c.speed;
        c.angle += c.spin;
        
        if (c.y > canvas.height) {
          c.y = -20;
          c.x = Math.random() * canvas.width;
        }
      });
      
      requestAnimationFrame(drawConfetti);
    }
    
    drawConfetti();
    
    setTimeout(() => {
      canvas.style.opacity = '0';
      setTimeout(() => {
        canvas.remove();
      }, 1000);
    }, 5000);
  }

  setTimeout(createConfetti, 500);

  // Success icon animation
  const confirmationIcon = document.querySelector('#page-confirmation .confirmation-icon');
  if (confirmationIcon) {
    confirmationIcon.style.transform = 'scale(0)';
    setTimeout(() => {
      confirmationIcon.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      confirmationIcon.style.transform = 'scale(1)';
    }, 300);
  }

  console.log('✅ Confirmation page loaded successfully');
  console.log('📧 User Email:', userData.email);
  console.log('📞 User Phone:', maskPhone(userData.phone));
  console.log('💰 Total Amount:', formatCurrency(itineraryData.total));
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
});
